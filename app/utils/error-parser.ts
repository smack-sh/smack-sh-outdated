/**
 * Structured error information from HTTP responses
 */
export interface HttpErrorInfo {
  message: string;
  statusCode: number;
  statusText: string;
  isRetryable: boolean;
  errorType: 'network' | 'client' | 'server' | 'authentication' | 'authorization' | 'rate_limit' | 'unknown';
  details?: string;
  retryAfter?: number;
}

/**
 * Parses an HTTP response error and returns structured error information
 * Replaces string matching patterns with proper status code parsing
 */
export async function parseHttpError(response: Response): Promise<HttpErrorInfo> {
  const statusCode = response.status;
  const statusText = response.statusText;

  // Try to parse error response body
  let errorMessage = `Request failed with status ${statusCode}`;
  let errorDetails: string | undefined;
  let retryAfter: number | undefined;

  try {
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      const errorData = (await response.json()) as Record<string, unknown>;
      errorMessage = (errorData.message as string) || (errorData.error as string) || errorMessage;
      errorDetails = (errorData.details as string) || (errorData.stack as string);
      
      // Check for rate limit headers
      if (statusCode === 429) {
        const retryAfterHeader = response.headers.get('retry-after');
        if (retryAfterHeader) {
          retryAfter = parseInt(retryAfterHeader, 10);
        }
      }
    } else if (contentType?.includes('text/')) {
      const errorText = await response.text();
      if (errorText) {
        errorDetails = errorText;
      }
    }
  } catch {
    // If parsing fails, use default message
  }

  // Determine error type based on status code (not string matching!)
  let errorType: HttpErrorInfo['errorType'] = 'unknown';
  let isRetryable = false;
  let userFriendlyMessage = errorMessage;

  if (statusCode >= 200 && statusCode < 300) {
    // Not an error
    errorType = 'unknown';
  } else if (statusCode === 401) {
    errorType = 'authentication';
    userFriendlyMessage = 'Authentication required. Please sign in and try again.';
    isRetryable = false;
  } else if (statusCode === 403) {
    errorType = 'authorization';
    userFriendlyMessage = 'Access denied. You do not have permission to perform this action.';
    isRetryable = false;
  } else if (statusCode === 404) {
    errorType = 'client';
    userFriendlyMessage = 'Resource not found. Please check the URL and try again.';
    isRetryable = false;
  } else if (statusCode === 429) {
    errorType = 'rate_limit';
    userFriendlyMessage = retryAfter
      ? `Rate limit exceeded. Please try again after ${retryAfter} seconds.`
      : 'Rate limit exceeded. Please wait a moment and try again.';
    isRetryable = true;
  } else if (statusCode >= 400 && statusCode < 500) {
    errorType = 'client';
    userFriendlyMessage = errorMessage || 'Invalid request. Please check your input and try again.';
    isRetryable = false;
  } else if (statusCode >= 500) {
    errorType = 'server';
    userFriendlyMessage = 'Server error. Please try again later.';
    isRetryable = true;
  } else if (statusCode === 0) {
    // Network error (no response)
    errorType = 'network';
    userFriendlyMessage = 'Network error. Please check your internet connection and try again.';
    isRetryable = true;
  }

  return {
    message: userFriendlyMessage,
    statusCode,
    statusText,
    isRetryable,
    errorType,
    details: errorDetails,
    retryAfter,
  };
}

/**
 * Parses a fetch error (network errors, etc.)
 */
export function parseFetchError(error: unknown): HttpErrorInfo {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      message: 'Network error. Please check your internet connection and try again.',
      statusCode: 0,
      statusText: 'Network Error',
      isRetryable: true,
      errorType: 'network',
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message || 'An unexpected error occurred',
      statusCode: 0,
      statusText: 'Unknown Error',
      isRetryable: false,
      errorType: 'unknown',
      details: error.stack,
    };
  }

  return {
    message: 'An unexpected error occurred',
    statusCode: 0,
    statusText: 'Unknown Error',
    isRetryable: false,
    errorType: 'unknown',
  };
}

/**
 * Safe fetch wrapper that parses errors properly
 */
export async function safeFetch(
  url: string,
  options?: RequestInit,
): Promise<{ success: true; data: Response } | { success: false; error: HttpErrorInfo }> {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      const errorInfo = await parseHttpError(response);
      return { success: false, error: errorInfo };
    }

    return { success: true, data: response };
  } catch (error) {
    const errorInfo = parseFetchError(error);
    return { success: false, error: errorInfo };
  }
}

