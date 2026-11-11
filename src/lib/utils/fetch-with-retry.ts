interface FetchWithRetryOptions extends RequestInit {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
  onRetry?: (error: Error, attempt: number) => void;
}

class NetworkError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export async function fetchWithRetry(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<Response> {
  const {
    retries = 3,
    retryDelay = 1000,
    timeout = 10000,
    onRetry,
    ...fetchOptions
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt <= retries; attempt++) {
    let timeoutId: NodeJS.Timeout | undefined;
    
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check if response is ok
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error as Error;

      // Don't retry on certain errors
      if (error instanceof DOMException && error.name === 'AbortError') {
        lastError = new TimeoutError('Request timeout');
      } else if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        lastError = new NetworkError('Network connection failed', 'NETWORK_ERROR');
      }

      // If this is the last attempt, throw the error
      if (attempt === retries) {
        break;
      }

      // Call retry callback if provided
      if (onRetry) {
        onRetry(lastError, attempt + 1);
      }

      // Wait before retrying with exponential backoff
      const delay = retryDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// Enhanced fetch with better error handling
export async function safeFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  try {
    const response = await fetchWithRetry(url, {
      ...options,
      retries: 2,
      retryDelay: 1000,
      timeout: 15000,
    });

    return response;
  } catch (error) {
    // Log error for debugging
    console.error('Fetch error:', {
      url,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });

    // Re-throw with more context
    if (error instanceof NetworkError) {
      throw new NetworkError(`Network error when fetching ${url}: ${error.message}`, error.code);
    }
    
    if (error instanceof TimeoutError) {
      throw new TimeoutError(`Request timeout when fetching ${url}: ${error.message}`);
    }

    throw new Error(`Failed to fetch ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Utility for API calls with JSON response
export async function fetchJson<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await safeFetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  try {
    return await response.json();
  } catch (error) {
    throw new Error(`Failed to parse JSON response from ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Utility for file uploads with progress
export async function fetchWithProgress(
  url: string,
  file: File,
  options: RequestInit & {
    onProgress?: (progress: number) => void;
  } = {}
): Promise<Response> {
  const { onProgress, ...fetchOptions } = options;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Progress tracking
    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress);
        }
      });
    }

    // Load handling
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(new Response(xhr.responseText, {
          status: xhr.status,
          statusText: xhr.statusText,
        }));
      } else {
        reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
      }
    });

    // Error handling
    xhr.addEventListener('error', () => {
      reject(new NetworkError('Network connection failed', 'NETWORK_ERROR'));
    });

    xhr.addEventListener('timeout', () => {
      reject(new TimeoutError('Request timeout'));
    });

    // Configure and send
    xhr.timeout = 30000; // 30 seconds
    xhr.open('POST', url);

    // Set headers
    if (fetchOptions.headers) {
      Object.entries(fetchOptions.headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value as string);
      });
    }

    const formData = new FormData();
    formData.append('file', file);

    xhr.send(formData);
  });
}
