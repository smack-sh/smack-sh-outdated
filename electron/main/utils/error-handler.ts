import { app, dialog, BrowserWindow } from 'electron';
import log from 'electron-log';

/**
 * Error information interface for structured error reporting
 */
interface ErrorInfo {
  message: string;
  stack?: string;
  code?: string | number;
  statusCode?: number;
  isFatal?: boolean;
}

/**
 * Shows a crash dialog to the user for fatal errors
 */
function showCrashDialog(error: ErrorInfo): void {
  const message = `A fatal error occurred:\n\n${error.message}\n\n${
    error.stack ? `Technical details:\n${error.stack.substring(0, 500)}` : ''
  }`;

  dialog
    .showMessageBox({
      type: 'error',
      title: 'Application Error',
      message: 'The application encountered a critical error',
      detail: message,
      buttons: ['Reload', 'Quit'],
      defaultId: 0,
      cancelId: 1,
    })
    .then((result) => {
      if (result.response === 0) {
        // Reload
        const windows = BrowserWindow.getAllWindows();
        windows.forEach((win) => {
          if (win && !win.isDestroyed()) {
            win.reload();
          }
        });
      } else {
        // Quit
        app.quit();
      }
    })
    .catch((dialogError) => {
      log.error('Failed to show crash dialog:', dialogError);
      app.quit();
    });
}

/**
 * Sends error information to all renderer processes
 */
function notifyRenderers(error: ErrorInfo): void {
  const windows = BrowserWindow.getAllWindows();

  windows.forEach((win) => {
    if (win && !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
      try {
        win.webContents.send('main-process-error', {
          message: error.message,
          code: error.code,
          statusCode: error.statusCode,
          isFatal: error.isFatal ?? false,
          timestamp: new Date().toISOString(),
        });
      } catch (sendError) {
        log.error('Failed to send error to renderer:', sendError);
      }
    }
  });
}

/**
 * Parses an error and extracts structured information
 */
function parseError(error: unknown): ErrorInfo {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      code: (error as any).code,
      statusCode: (error as any).statusCode,
    };
  }

  if (typeof error === 'string') {
    return { message: error };
  }

  if (error && typeof error === 'object') {
    const errorObj = error as Record<string, unknown>;
    return {
      message: String(errorObj.message ?? 'Unknown error'),
      code: errorObj.code as string | number | undefined,
      statusCode: errorObj.statusCode as number | undefined,
      stack: errorObj.stack as string | undefined,
    };
  }

  return { message: 'Unknown error occurred' };
}

/**
 * Sets up global error handlers for the Electron main process
 */
export function setupErrorHandlers(): void {
  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    const errorInfo = parseError(error);
    errorInfo.isFatal = true;

    log.error('Uncaught Exception:', errorInfo);

    // Try to notify renderers before showing dialog
    notifyRenderers(errorInfo);

    // Show crash dialog
    if (app.isReady()) {
      showCrashDialog(errorInfo);
    } else {
      // If app isn't ready, log and exit gracefully
      log.error('Fatal error before app ready:', errorInfo);
      process.exit(1);
    }
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
    const errorInfo = parseError(reason);
    errorInfo.isFatal = false; // Rejections are usually non-fatal

    log.error('Unhandled Rejection:', {
      reason: errorInfo,
      promise: promise.toString(),
    });

    // Notify renderers
    if (app.isReady()) {
      notifyRenderers(errorInfo);
    }
  });

  // Handle renderer process crashes
  app.on('render-process-gone', (event, webContents, details) => {
    log.error('Render process crashed:', {
      reason: details.reason,
      exitCode: details.exitCode,
    });

    const errorInfo: ErrorInfo = {
      message: `Renderer process crashed: ${details.reason}`,
      code: details.exitCode,
      isFatal: true,
    };

    notifyRenderers(errorInfo);

    if (details.reason === 'crashed') {
      dialog
        .showMessageBox({
          type: 'error',
          title: 'Renderer Process Crashed',
          message: 'The application window has crashed',
          detail: `Reason: ${details.reason}\nExit Code: ${details.exitCode ?? 'N/A'}`,
          buttons: ['Reload', 'Quit'],
        })
        .then((result) => {
          if (result.response === 0 && webContents && !webContents.isDestroyed()) {
            webContents.reload();
          } else {
            app.quit();
          }
        });
    }
  });

  log.info('Error handlers initialized');
}

/**
 * Manually report an error (for use in try-catch blocks)
 */
export function reportError(error: unknown, isFatal = false): void {
  const errorInfo = parseError(error);
  errorInfo.isFatal = isFatal;

  log.error('Reported error:', errorInfo);

  if (app.isReady()) {
    if (isFatal) {
      showCrashDialog(errorInfo);
    } else {
      notifyRenderers(errorInfo);
    }
  }
}

