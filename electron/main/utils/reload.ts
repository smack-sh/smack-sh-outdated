import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { promises as fs } from 'node:fs';

// Reload on change.
let isQuited = false;

const abort = new AbortController();
const { signal } = abort;

export async function reloadOnChange() {
  const dir = path.join(app.getAppPath(), 'build', 'electron');

  try {
    const watcher = fs.watch(dir, { signal, recursive: true });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _event of watcher) {
      if (!isQuited) {
        isQuited = true;
        console.log('Code change detected, reloading application...');
        
        // Close all windows gracefully before reloading
        const windows = BrowserWindow.getAllWindows();
        windows.forEach((win) => {
          if (win && !win.isDestroyed()) {
            try {
              if (win.webContents && !win.webContents.isDestroyed()) {
                win.webContents.send('app-will-reload');
              }
            } catch (sendError) {
              // Ignore errors sending to destroyed windows
            }
          }
        });

        // Small delay to allow renderer to clean up
        setTimeout(() => {
          app.relaunch();
          app.quit();
        }, 100);
      }
    }
  } catch (err) {
    if (!(err instanceof Error)) {
      throw err;
    }

    if (err.name === 'AbortError') {
      console.log('abort watching:', dir);
      return;
    }

    // Log other errors but don't crash
    console.error('Error in file watcher:', err);
  }
}
