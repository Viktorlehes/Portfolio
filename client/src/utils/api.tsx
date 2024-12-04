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

export const isDataExpired = (timestamp: number, maxAgeInMinutes: number = 5): boolean => {
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
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
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