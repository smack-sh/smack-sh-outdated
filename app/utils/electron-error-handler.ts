/**
 * Sets up error handling for the Electron renderer process
 * Listens for errors from the main process and displays them to users
 */

interface MainProcessError {
  message: string;
  code?: string | number;
  statusCode?: number;
  isFatal?: boolean;
  timestamp: string;
}

/**
 * Sets up IPC listeners for main process errors
 */
export function setupRendererErrorHandlers(): void {
  // Only run in Electron environment
  if (typeof window === 'undefined' || !('electron' in window)) {
    return;
  }

  try {
    // Listen for errors from main process
    const ipcRenderer = (window as any).electron?.ipcRenderer;
    
    if (ipcRenderer) {
      ipcRenderer.on('main-process-error', (_event: unknown, error: MainProcessError) => {
        console.error('Main process error received:', error);
        
        // Show user-friendly error notification
        const errorMessage = error.isFatal
          ? `A critical error occurred: ${error.message}. The application may need to be reloaded.`
          : `An error occurred: ${error.message}`;
        
        // You can integrate with your notification system here
        // For example, using a toast library or custom notification component
        if (typeof window !== 'undefined') {
          // Only show alert for fatal errors to avoid being too intrusive
          if (error.isFatal && typeof window.confirm === 'function') {
            const shouldReload = window.confirm(
              `${errorMessage}\n\nWould you like to reload the application?`
            );
            if (shouldReload) {
              window.location.reload();
            }
          }
        }
      });
    }
  } catch (error) {
    console.error('Failed to setup renderer error handlers:', error);
  }
}

/**
 * Listen for app reload notifications
 */
export function setupAppReloadListener(): void {
  if (typeof window === 'undefined' || !('electron' in window)) {
    return;
  }

  try {
    const ipcRenderer = (window as any).electron?.ipcRenderer;
    
    if (ipcRenderer) {
      ipcRenderer.on('app-will-reload', () => {
        console.log('App will reload soon, cleaning up...');
        // Perform any cleanup operations here
        // For example, save state, close connections, etc.
      });
    }
  } catch (error) {
    console.error('Failed to setup app reload listener:', error);
  }
}

// Auto-setup if in browser context
if (typeof window !== 'undefined') {
  // Setup error handlers when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setupRendererErrorHandlers();
      setupAppReloadListener();
    });
  } else {
    setupRendererErrorHandlers();
    setupAppReloadListener();
  }
}

