import React, { useState, useEffect, useRef } from "react";
import { LoaderFunction, useLoaderData } from "react-router-dom";
import "./Overview.css";
import CustomNavbar from "../../components/Default/CustomNavBar";
import CryptoCategoriesSidebar from "../../components/overview/CryptoCatagorieList";
import CryptoStatsBar from '../../components/overview/CryptoStatsBar';
import { components } from "../../types/api-types";
import CoinglassMetricsBar from "../../components/overview/CoinglassMetricBar";
import TotalWorth from "../../components/overview/TotalWorth";
import { getCachedData, isDataExpired } from "../../utils/api";
import { OverviewTokensTable } from "../../components/overview/OverviewTokensTable";

type MarketData = components["schemas"]["MarketDataResponse"];
type FearGreedResponse = components["schemas"]["FearGreedResponse"];
type Wallet = components["schemas"]["Wallet"];
type CGLSApiResponse = components["schemas"]["APIResponse"];
type TokenOverviewResponse = components['schemas']['TokenOverviewData'];
type CategoryResponse = components['schemas']['CategoryResponse'];

interface ComponentLoadingState {
  market: boolean;
  fearGreed: boolean;
  wallets: boolean;
  cglsScrapeData: boolean;
  TokenOverviewData: boolean;
  cgCategories: boolean;
}

interface CachedData<T> {
  data: T;
  timestamp: number;
}

interface LoaderData {
  marketData: CachedData<MarketData>;
  fearGreedData: CachedData<FearGreedResponse>;
  wallets: CachedData<Wallet[]>;
  cglsScrapeData: CachedData<CGLSApiResponse>;
  TokenOverviewData: CachedData<TokenOverviewResponse[]>;
  cgCategories: CachedData<CategoryResponse>;
}

const CACHE_KEYS = {
  MARKET: 'marketData',
  FEAR_GREED: 'fearGreedData',
  WALLETS: 'wallets',
  CGLS: 'cglsScrapeData',
  TOKENS: 'TokenOverviewData',
  CG_CATAGORIES: 'cgCategories'
} as const;

const API_ENDPOINTS = {
  MARKET: 'http://127.0.0.1:8000/overview/cryptostats',
  FEAR_GREED: 'http://127.0.0.1:8000/overview/feargreedindex',
  WALLETS: 'http://127.0.0.1:8000/wallets/get_wallets',
  CGLS: 'http://127.0.0.1:8000/overview/get-scraped-CGLS-data',
  TOKEN_OVERVIEW: 'http://127.0.0.1:8000/overview/overview-tokens-table-data',
  CG_CATAGORIES: 'http://127.0.0.1:8000/overview/get-crypto-catagories',
} as const;

export const overviewLoader: LoaderFunction = () => {
  const cachedMarket = getCachedData(CACHE_KEYS.MARKET);
  const cachedFearGreed = getCachedData(CACHE_KEYS.FEAR_GREED);
  const cachedWallets = getCachedData(CACHE_KEYS.WALLETS);
  const cachedCglsScrapeData = getCachedData(CACHE_KEYS.CGLS);
  const cachedTokenOverviewData = getCachedData(CACHE_KEYS.TOKENS);
  const cachedCategories = getCachedData(CACHE_KEYS.CG_CATAGORIES);

  return {
    marketData: { data: cachedMarket?.data || null, timestamp: cachedMarket?.timestamp || null } as CachedData<MarketData>,
    fearGreedData: { data: cachedFearGreed?.data || null, timestamp: cachedFearGreed?.timestamp || null } as CachedData<FearGreedResponse>,
    wallets: { data: cachedWallets?.data || [], timestamp: cachedWallets?.timestamp || null } as CachedData<Wallet[]>,
    cglsScrapeData: { data: cachedCglsScrapeData?.data || null, timestamp: cachedCglsScrapeData?.timestamp || null } as CachedData<CGLSApiResponse>,
    TokenOverviewData: { data: cachedTokenOverviewData?.data || [], timestamp: cachedTokenOverviewData?.timestamp || null } as CachedData<TokenOverviewResponse[]>,
    cgCategories: { data: cachedCategories?.data || [], timestamp: cachedCategories?.timestamp || null } as CachedData<CategoryResponse>
  } as LoaderData;
};

const Overview: React.FC = () => {
  const cachedData = useLoaderData() as LoaderData;
  const [overviewData, setOverviewData] = useState({
    marketData: cachedData.marketData,
    fearGreedData: cachedData.fearGreedData,
    wallets: cachedData.wallets,
    cglsScrapeData: cachedData.cglsScrapeData,
    TokenOverviewData: cachedData.TokenOverviewData,
    cgCategories: cachedData.cgCategories
  });

  const activeFetches = useRef(new Set<string>());

  const [loadingStates, setLoadingStates] = useState<ComponentLoadingState>({
    market: !cachedData.marketData.data,
    fearGreed: !cachedData.fearGreedData.data,
    wallets: !cachedData.wallets.data,
    cglsScrapeData: !cachedData.cglsScrapeData.data,
    TokenOverviewData: !cachedData.TokenOverviewData.data,
    cgCategories: !cachedData.cgCategories.data
  });

  // Map cache keys to state keys
  const STATE_KEY_MAP = {
    MARKET: 'marketData',
    FEAR_GREED: 'fearGreedData',
    WALLETS: 'wallets',
    CGLS: 'cglsScrapeData',
    TOKENS: 'TokenOverviewData',
    CG_CATAGORIES: 'cgCategories'
  } as const;

  const fetchData = async (
    endpoint: string,
    cacheKey: keyof typeof CACHE_KEYS,
    loadingKey: keyof ComponentLoadingState,
    expirationMinutes: number = 5
  ) => {
    // If already fetching this endpoint, skip
    if (activeFetches.current.has(endpoint)) {
      return null;
    }

    const stateKey = STATE_KEY_MAP[cacheKey];
    const timestamp = overviewData[stateKey].timestamp || 0;
    const shouldFetch = loadingStates[loadingKey] || isDataExpired(timestamp, expirationMinutes);

    if (shouldFetch) {
      try {
        activeFetches.current.add(endpoint);
        const response = await fetch(endpoint);
        const data = await response.json();

        if (!data || data.detail) {
          return null;
        }

        const newCacheData = {
          data: data,
          timestamp: Date.now()
        };

        // Store in localStorage
        localStorage.setItem(CACHE_KEYS[cacheKey], JSON.stringify(newCacheData));

        // Update loading state
        setLoadingStates(prev => ({ ...prev, [loadingKey]: false }));

        return { key: stateKey, data: newCacheData };
      } catch (error) {
        console.error(`Error fetching ${cacheKey}:`, error);
        return null;
      } finally {
        activeFetches.current.delete(endpoint);
      }
    }
    return null;
  };

  const updateExpiredData = async () => {
    const fetchPromises = [
      fetchData(API_ENDPOINTS.MARKET, "MARKET", 'market'),
      fetchData(API_ENDPOINTS.FEAR_GREED, 'FEAR_GREED', 'fearGreed'),
      fetchData(API_ENDPOINTS.WALLETS, 'WALLETS', 'wallets'),
      fetchData(API_ENDPOINTS.CGLS, 'CGLS', 'cglsScrapeData'),
      fetchData(API_ENDPOINTS.TOKEN_OVERVIEW, 'TOKENS', 'TokenOverviewData'),
      fetchData(API_ENDPOINTS.CG_CATAGORIES, 'CG_CATAGORIES', 'cgCategories')
    ];

    const results = await Promise.all(fetchPromises);

    // Filter out null results and update state in one batch
    const validResults = results.filter(result => result !== null);
    if (validResults.length > 0) {
      setOverviewData(prev => {
        const newState = { ...prev };
        validResults.forEach(result => {
          if (result) {
            newState[result.key] = result.data;
          }
        });
        return newState;
      });
    }
  };

  useEffect(() => {
    // Check if any loading state is true (meaning data was null from loader)
    const hasNullData = Object.values(loadingStates).some(isLoading => isLoading);
    
    if (hasNullData) {
      updateExpiredData();
    }
  
    const intervalId = setInterval(updateExpiredData, 60000);
    return () => {
      clearInterval(intervalId);
      activeFetches.current.clear();
    };
  }, []);

  return (
    <div className="default-page">
      <div className="overview-page-header">
        <div className="overview-main-header-content">
          <h1>Market Overview</h1>
          <CustomNavbar />
        </div>
        <div>
          <CryptoStatsBar
            cryptoStats={overviewData.marketData.data}
            feargreeddata={overviewData.fearGreedData.data}
            isLoading={{
              market: loadingStates.market,
              fearGreed: loadingStates.fearGreed
            }}
          />
        </div>
      </div>
      <div className="page-content">
        <div className="overview-wrapper">
          <div className="main-content">
            <section className="coinglass-data-bar">
              <CoinglassMetricsBar data={overviewData.cglsScrapeData.data} isLoading={loadingStates.cglsScrapeData} />
              <TotalWorth
                wallets={overviewData.wallets.data}
                isLoading={loadingStates.wallets}
              />
            </section>
            <section className="overview-token-table">
              <OverviewTokensTable tokens={overviewData.TokenOverviewData.data} isLoading={loadingStates.TokenOverviewData} />
              <CryptoCategoriesSidebar categories={overviewData.cgCategories.data} isLoading={loadingStates.cgCategories} />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;