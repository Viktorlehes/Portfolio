import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/authContext';
const API_KEY = import.meta.env.VITE_API_KEY;
const BASE_URL = import.meta.env.VITE_API_URL;

interface CachedData<T> {
  data: T;
  timestamp: number;
}

export const getCachedData = (key: string): CachedData<any> | null => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

export const isDataExpired = (timestamp: number, maxAgeInMinutes: number = 10): boolean => {
  return (Date.now() - timestamp) / (1000 * 60) > maxAgeInMinutes;
};

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
}

export async function fetchWithAuth<T>(
  endpoint: string, 
  options: FetchOptions = {}
): Promise<APIResponse<T>> {
  const { params, ...fetchOptions } = options;
  let url = `${BASE_URL}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      searchParams.append(key, String(value));
    });
    url += `?${searchParams.toString()}`;
  }

  const sessionToken = sessionStorage.getItem('sessionToken');
  console.log(sessionToken);

  const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
    ...(sessionToken && { 'Authorization': `Bearer ${sessionToken}` }),
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    const responseData = await response.json();

    // Handle non-OK responses
    if (!response.ok) {
      if (response.status === 401) {
        sessionStorage.removeItem('sessionToken');
        window.dispatchEvent(new Event('auth-error'));
      }
    }

    return responseData;
  } catch (error) {
    return {
      data: null,
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
      status_code: 500,
      timestamp: new Date().toISOString()
    };
  }
}

// Helper methods for common HTTP methods
export const api = {
  get: function<T>(endpoint: string, params?: Record<string, string | number | boolean>) {
    return fetchWithAuth<T>(endpoint, { method: 'GET', params });
  },

  post: function<T, R>(endpoint: string, data: R, params?: Record<string, string | number | boolean>) {
    return fetchWithAuth<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      params,
    });
  },

  put: function<T, R>(endpoint: string, data: R, params?: Record<string, string | number | boolean>) {
    return fetchWithAuth<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      params,
    });
  },

  delete: function<T>(endpoint: string, params?: Record<string, string | number | boolean>) {
    return fetchWithAuth<T>(endpoint, { method: 'DELETE', params });
  },
};

// Define fetch states
export interface FetchState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  status: number | null
  refetch: () => Promise<void>;
}

// Configuration for endpoints
interface EndpointConfig {
  endpoint: string;
  staleTime?: number;  // How long before data is considered stale (in ms)
  cacheInStorage?: boolean;
  retryConfig?: {
    maxRetries: number;
    delayMs: number;
  };
  initialData?: any | null;
  requiresAuth?: boolean
}

const defaultRetryConfig = {
  maxRetries: 3,
  delayMs: 5000,
};

export interface APIResponse<T> {
  data: T | null;
  success: boolean;
  error: string | null;
  status_code: number;
  timestamp: string;
}

export function useDataFetching<T>(config: EndpointConfig): FetchState<T> {
  const [state, setState] = useState<FetchState<T>>({
    data: config.initialData?.data || null,
    isLoading: !config.initialData?.data,
    error: null,
    status: null,
    refetch: async () => {}
  });

  const { isAuthenticated } = useAuth();

  const fetchData = useCallback(async (showLoading = false) => {
    if (config.requiresAuth && !isAuthenticated) {
      setState(prev => ({
        ...prev,
        error: 'Authentication required',
        status: 401,
        isLoading: false
      }))
      return;
    }
  
    let retries = 0;
    const maxRetries = config.retryConfig?.maxRetries ?? defaultRetryConfig.maxRetries;
    const delayMs = config.retryConfig?.delayMs ?? defaultRetryConfig.delayMs;

    if (showLoading) {
      setState(prev => ({ ...prev, isLoading: true }));
    }

    while (retries <= maxRetries) {
      try {
        const params = new URLSearchParams();
        if (showLoading) params.append('force_update', 'true');
        const apiUrl = `${config.endpoint}${params.toString() ? `?${params.toString()}` : ''}`;

        const response = await api.get<T>(apiUrl);

        if (!response.success || response.error) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: response.error || 'Request failed',
            status: response.status_code,
            refetch
          }));
          break;
        }

        if (config.cacheInStorage) {
          localStorage.setItem(config.endpoint, JSON.stringify({
            data: response.data,
            timestamp: Date.now()
          }));
        }

        setState({
          data: response.data,
          isLoading: false,
          error: null,
          status: response.status_code,
          refetch
        });
        break;
      } catch (error) {
        retries++;
        if (retries === maxRetries) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: 'Request failed',
            status: 500,
          }));
          break;
        }
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }, [config.endpoint, config.cacheInStorage]); // Only depend on what's used in the callback

  const refetch = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  useEffect(() => {
    // Check cached data only on mount
    const checkCachedData = () => {
      if (config.cacheInStorage) {
        const cached = localStorage.getItem(config.endpoint);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          const isStale = config.staleTime && Date.now() - timestamp > config.staleTime;
          if (!isStale) {
            setState(prev => ({
              ...prev,
              data,
              isLoading: false,
              error: null,
              refetch
            }));
            return true;
          }
        }
      }
      return false;
    };

    // Initial data fetch
    const initializeFetch = async () => {
      const hasCachedData = checkCachedData();
      if (!hasCachedData) {
        await fetchData();
      }
    };

    initializeFetch();

    // Set up polling interval
    let intervalId: NodeJS.Timeout | null = null;
    if (config.staleTime) {
      intervalId = setInterval(fetchData, config.staleTime);
    }

    // Cleanup
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [config.endpoint, config.staleTime, config.cacheInStorage, fetchData]); // Include all dependencies used in the effect

  return { ...state, refetch };
}

export const ENDPOINTS = {
  MARKET: {
    endpoint: '/overview/marketstats',
    staleTime: 5 * 60 * 1000, 
  },
  FEAR_GREED: {
    endpoint: '/overview/feargreedindex',
    staleTime: 5 * 60 * 1000,
  },
  WALLETS: {
    endpoint: '/wallet/',
    staleTime: 5 * 60 * 1000,
    cacheInStorage: true,
    requiresAuth: true
  },
  TOKENS: {
    endpoint: '/overview/token_table',
    staleTime: 5 * 60 * 1000,
    retryConfig: {
      maxRetries: 5,
      delayMs: 10000,
    },
    cacheInStorage: true
  },
  CATEGORIES: {
    endpoint: '/overview/user_categories',
    staleTime: 10 * 60 * 1000,
    retryConfig: {
      maxRetries: 5,
      delayMs: 10000,
    },
  },
  CGLS_SCRAPE: {
    endpoint: '/overview/scraped-CGLS-data',
    staleTime: 5 * 60 * 1000,
  },
  DEFAULT_CATEGORIES: {
    endpoint: '/overview/default_categories',
    staleTime: 10 * 60 * 1000,
    cacheInStorage: true
  },
  DEFAULT_TOKENS: {
    endpoint: '/overview/get-default-tokens',
    staleTime: 10 * 60 * 1000,
    cacheInStorage: true
  },
  ALERTS: {
    endpoint: '/alert/',
    staleTime: 5 * 60 * 1000,
    requiresAuth: true,
  }, 
  CHARTS: {
    endpoint: '/chart/day',
    staleTime: 5 * 60 * 1000,
  },
  SINGLETOKEN: {
    endpoint: '/token',
    staleTime: 5 * 60 * 1000,
  }
} as const;