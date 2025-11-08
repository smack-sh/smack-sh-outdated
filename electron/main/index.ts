/// <reference types="vite/client" />
import { createRequestHandler } from '@remix-run/node';
import electron, { app, BrowserWindow, ipcMain, protocol, session } from 'electron';
import log from 'electron-log';
import path from 'node:path';
import * as pkg from '../../package.json';
import { setupAutoUpdater } from './utils/auto-update';
import { isDev, DEFAULT_PORT } from './utils/constants';
import { initViteServer, viteServer } from './utils/vite-server';
import { setupMenu } from './ui/menu';
import { createWindow } from './ui/window';
import { initCookies, storeCookies } from './utils/cookie';
import { loadServerBuild, serveAsset } from './utils/serve';
import { reloadOnChange } from './utils/reload';
import { setupErrorHandlers, reportError } from './utils/error-handler';

Object.assign(console, log.functions);

console.debug('main: import.meta.env:', import.meta.env);
console.log('main: isDev:', isDev);
console.log('NODE_ENV:', global.process.env.NODE_ENV);
console.log('isPackaged:', app.isPackaged);

// Setup error handlers (must be done early)
setupErrorHandlers();

// Validate and configure APP_PATH_ROOT with fallbacks
(() => {
  const root = global.process.env.APP_PATH_ROOT ?? import.meta.env.VITE_APP_PATH_ROOT;

  if (root === undefined) {
    console.log('No APP_PATH_ROOT or VITE_APP_PATH_ROOT provided. Using default paths.');
    return;
  }

  if (!path.isAbsolute(root)) {
    const errorMessage = `APP_PATH_ROOT must be an absolute path, but got: ${root}. Using default paths instead.`;
    console.warn(errorMessage);
    reportError(new Error(errorMessage), false);
    return; // Use default paths instead of crashing
  }

  try {

    console.log(`APP_PATH_ROOT: ${root}`);

    const subdirName = pkg.name;

    for (const [key, val] of [
      ['appData', ''],
      ['userData', subdirName],
      ['sessionData', subdirName],
    ] as const) {
      const targetPath = path.join(root, val);
      app.setPath(key, targetPath);
      console.log(`Set ${key} path to: ${targetPath}`);
    }

    app.setAppLogsPath(path.join(root, subdirName, 'Logs'));
    console.log(`Set logs path to: ${path.join(root, subdirName, 'Logs')}`);
  } catch (pathError) {
    const errorMessage = `Failed to set app paths: ${pathError instanceof Error ? pathError.message : String(pathError)}. Using default paths.`;
    console.warn(errorMessage);
    reportError(pathError, false);
    // Continue with default paths
  }
})();

console.log('appPath:', app.getAppPath());

const keys: Parameters<typeof app.getPath>[number][] = ['home', 'appData', 'userData', 'sessionData', 'logs', 'temp'];
keys.forEach((key) => console.log(`${key}:`, app.getPath(key)));
console.log('start whenReady');

declare global {
  // eslint-disable-next-line no-var, @typescript-eslint/naming-convention
  var __electron__: typeof electron;
}

(async () => {
  await app.whenReady();
  console.log('App is ready');

  // Load any existing cookies from ElectronStore, set as cookie
  await initCookies();

  const serverBuild = await loadServerBuild();

  protocol.handle('http', async (req) => {
    console.log('Handling request for:', req.url);

    if (isDev) {
      console.log('Dev mode: forwarding to vite server');
      return await fetch(req);
    }

    req.headers.append('Referer', req.referrer);

    try {
      const url = new URL(req.url);

      // Forward requests to specific local server ports
      if (url.port !== `${DEFAULT_PORT}`) {
        console.log('Forwarding request to local server:', req.url);
        return await fetch(req);
      }

      // Always try to serve asset first
      const assetPath = path.join(app.getAppPath(), 'build', 'client');
      const res = await serveAsset(req, assetPath);

      if (res) {
        console.log('Served asset:', req.url);
        return res;
      }

      // Forward all cookies to remix server
      const cookies = await session.defaultSession.cookies.get({});

      if (cookies.length > 0) {
        req.headers.set('Cookie', cookies.map((c) => `${c.name}=${c.value}`).join('; '));

        // Store all cookies
        await storeCookies(cookies);
      }

      // Create request handler with the server build
      const handler = createRequestHandler(serverBuild, 'production');
      console.log('Handling request with server build:', req.url);

      const result = await handler(req, {
        /*
         * Remix app access cloudflare.env
         * Need to pass an empty object to prevent undefined
         */
        // @ts-ignore:next-line
        cloudflare: {},
      });

      return result;
    } catch (err) {
      console.log('Error handling request:', {
        url: req.url,
        error:
          err instanceof Error
            ? {
                message: err.message,
                stack: err.stack,
                cause: err.cause,
              }
            : err,
      });

      const error = err instanceof Error ? err : new Error(String(err));

      return new Response(`Error handling request to ${req.url}: ${error.stack ?? error.message}`, {
        status: 500,
        headers: { 'content-type': 'text/plain' },
      });
    }
  });

  let rendererURL: string;

  try {
    rendererURL = await (isDev
      ? (async () => {
          try {
            await initViteServer();

            if (!viteServer) {
              throw new Error('Vite server is not initialized');
            }

            const listen = await viteServer.listen();
            global.__electron__ = electron;
            viteServer.printUrls();

            return `http://localhost:${listen.config.server.port}`;
          } catch (viteError) {
            reportError(viteError, false);
            throw new Error(`Failed to initialize Vite server: ${viteError instanceof Error ? viteError.message : String(viteError)}`);
          }
        })()
      : `http://localhost:${DEFAULT_PORT}`);

    console.log('Using renderer URL:', rendererURL);
  } catch (urlError) {
    reportError(urlError, true);
    throw urlError;
  }

  let win: BrowserWindow;

  try {
    win = await createWindow(rendererURL);
  } catch (windowError) {
    reportError(windowError, true);
    throw windowError;
  }

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow(rendererURL);
    }
  });

  console.log('end whenReady');

  return win;
})()
  .then((win) => {
    // IPC samples : send and receive.
    let count = 0;
    setInterval(() => {
      try {
        if (win && !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
          win.webContents.send('ping', `hello from main! ${count++}`);
        }
      } catch (sendError) {
        log.error('Failed to send ping to renderer:', sendError);
      }
    }, 60 * 1000);

    ipcMain.handle('ipcTest', (event, ...args) => {
      try {
        console.log('ipc: renderer -> main', { event, ...args });
      } catch (ipcError) {
        log.error('IPC handler error:', ipcError);
      }
    });

    return win;
  })
  .then((win) => {
    try {
      return setupMenu(win);
    } catch (menuError) {
      reportError(menuError, false);
      return win;
    }
  })
  .catch((error) => {
    reportError(error, true);
    // Don't throw here - error handler will deal with it
  });

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

reloadOnChange();
setupAutoUpdater();
