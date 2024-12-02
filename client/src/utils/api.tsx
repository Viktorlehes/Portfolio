import { components } from "../types/api-types";

type Wallet = components["schemas"]["Wallet"];

interface CachedData<T> {
  data: T;
  timestamp: number;
}

export async function getWallets(): Promise<Wallet[]> {
  try {
    const response = await fetch('http://127.0.0.1:8000/dashboard/wallets');
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.statusText}`);
    }

    const responseData = await response.json();

    return responseData;
  } catch (error) {
    console.error('Error fetching crypto stats:', error);
    throw new Error('Could not load crypto wallets');
  }
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