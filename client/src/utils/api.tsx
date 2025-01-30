import { useState, useEffect, useCallback } from 'react';
import { components } from "../types/api-types";
const API_KEY = import.meta.env.VITE_API_KEY;
const BASE_URL = import.meta.env.VITE_API_URL;

type Wallet = components["schemas"]["Wallet"];

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

export const fetchWithAuth = async (endpoint: string, options: FetchOptions = {}) => {
  const { params, ...fetchOptions } = options;
  let url = `${BASE_URL}${endpoint}`;

  // Add query parameters if they exist
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      searchParams.append(key, String(value));
    });
    url += `?${searchParams.toString()}`;
  }

  const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
    ...options.headers,
  };

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json();
    
    return {
      success: false,
      error: errorData.detail || 'Request failed',
      status: response.status
    };
  }

  return await response.json(); 
};

// Helper methods for common HTTP methods
export const api = {
  get: (endpoint: string, params?: Record<string, string | number | boolean>) =>
    fetchWithAuth(endpoint, { method: 'GET', params }),

  post: (endpoint: string, data: any, params?: Record<string, string | number | boolean>) =>
    fetchWithAuth(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      params,
    }),

  put: (endpoint: string, data: any, params?: Record<string, string | number | boolean>) =>
    fetchWithAuth(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      params,
    }),

  delete: (endpoint: string, params?: Record<string, string | number | boolean>) =>
    fetchWithAuth(endpoint, { method: 'DELETE', params }),
};

export async function getWallets(): Promise<Wallet[]> {
  try {
    const responseData = await api.get('/wallet/get_wallets');
    return responseData;
  } catch (error) {
    console.error('Error fetching crypto stats:', error);
    throw new Error('Could not load crypto wallets');
  }
}

// Define fetch states
export interface FetchState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
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
}

const defaultRetryConfig = {
  maxRetries: 3,
  delayMs: 5000,
};

export function useDataFetching<T>(config: EndpointConfig, email: string | null = null): FetchState<T> {
  const [state, setState] = useState<FetchState<T>>({
    data: config.initialData?.data || null,
    isLoading: !config.initialData?.data,
    error: null,
    refetch: async () => { }
  });

  const fetchData = useCallback(async (showLoading = false) => {
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
        if (email) params.append('email', email);
        const apiUrl = `${config.endpoint}${params.toString() ? `?${params.toString()}` : ''}`;

        const response = await api.get(apiUrl);

        if (config.cacheInStorage) {
          localStorage.setItem(config.endpoint, JSON.stringify({
            data: response,
            timestamp: Date.now()
          }));
        }

        setState({
          data: response,
          isLoading: false,
          error: null,
          refetch
        });
        break;
      } catch (error) {
        retries++;
        if (retries === maxRetries) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: error as Error
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
            setState({
              data,
              isLoading: false,
              error: null,
              refetch
            });
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
    endpoint: '/overview/cryptostats',
    staleTime: 5 * 60 * 1000, // 5 minutes
  },
  FEAR_GREED: {
    endpoint: '/overview/feargreedindex',
    staleTime: 5 * 60 * 1000,
  },
  WALLETS: {
    endpoint: '/wallets/get_wallets',
    staleTime: 5 * 60 * 1000,
    cacheInStorage: true,
  },
  TOKENS: {
    endpoint: '/overview/overview-tokens-table-data',
    staleTime: 10 * 60 * 1000,
    retryConfig: {
      maxRetries: 5,
      delayMs: 10000,
    }
  },
  CATEGORIES: {
    endpoint: '/overview/get-user-catagories',
    staleTime: 10 * 60 * 1000,
    retryConfig: {
      maxRetries: 5,
      delayMs: 10000,
    }
  },
  CGLS_SCRAPE: {
    endpoint: '/overview/get-scraped-CGLS-data',
    staleTime: 5 * 60 * 1000,
  },
  CUSTOM_CATEGORIES: {
    endpoint: '/overview/get-custom-categories',
    staleTime: 10 * 60 * 1000,
    retryConfig: {
      maxRetries: 5,
      delayMs: 10000,
    }
  },
  DEFAULT_CATEGORIES: {
    endpoint: '/overview/get-default-categories',
    staleTime: 10 * 60 * 1000,
  },
  DEFAULT_TOKENS: {
    endpoint: '/overview/get-default-tokens',
    staleTime: 10 * 60 * 1000,
  },
  ALERTS: {
    endpoint: '/alerts/get-alerts',
    staleTime: 5 * 60 * 1000,
  }
} as const;