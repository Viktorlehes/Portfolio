import React, { useState, useEffect, useCallback } from "react";
import { LoaderFunction, useLoaderData } from "react-router-dom";
import "./Overview.css";
import CustomNavbar from "../../components/Default/CustomNavBar";
import CryptoCategoriesSidebar from "../../components/overview/Categories/CryptoCategorieList";
import CryptoStatsBar from '../../components/overview/CryptoStatsBar';
import { components } from "../../types/api-types";
import CoinglassMetricsBar from "../../components/overview/CoinglassMetricBar";
import TotalWorth from "../../components/overview/TotalWorth";
import { getCachedData, isDataExpired } from "../../utils/api";
import { OverviewTokensTable } from "../../components/overview/OverviewTokensTable";
import { api } from "../../utils/api";
import { useActiveFetches, isEndpointFetching } from "../../context/ActiveFetchesContext";

type MarketData = components["schemas"]["MarketDataResponse"];
type FearGreedResponse = components["schemas"]["FearGreedResponse"];
type Wallet = components["schemas"]["Wallet"];
type CGLSApiResponse = components['schemas']['APIResponse'];
type TokenOverviewResponse = components['schemas']['TokenOverviewData'];
type CategoryResponse = components['schemas']['CategoryData'];
type CustomCategory = components['schemas']['CustomCategory'];

interface ComponentLoadingState {
  market: boolean;
  fearGreed: boolean;
  wallets: boolean;
  cglsScrapeData: boolean;
  TokenOverviewData: boolean;
  userCategories: boolean;
  customCategories: boolean;
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
  userCategories: CachedData<CategoryResponse[]>;
  customCategories: CachedData<CustomCategory[]>;
}

const CACHE_KEYS = {
  MARKET: 'marketData',
  FEAR_GREED: 'fearGreedData',
  WALLETS: 'wallets',
  CGLS: 'cglsScrapeData',
  TOKENS: 'TokenOverviewData',
  CMC_CATAGORIES: 'userCategories',
  CUSTOM_CATAGORIES: 'customCategories'
} as const;

interface EndpointConfig {
  key: keyof typeof CACHE_KEYS;
  endpoint: string;
  expiration: number; // milliseconds
}

const ENDPOINT_CONFIGS: EndpointConfig[] = [
  { key: 'MARKET', endpoint: '/overview/cryptostats', expiration: 1 },
  { key: 'FEAR_GREED', endpoint: '/overview/feargreedindex', expiration: 5 }, 
  { key: 'WALLETS', endpoint: '/wallets/get_wallets', expiration: 5 },
  { key: 'CGLS', endpoint: '/overview/get-scraped-CGLS-data', expiration: 5 },
  { key: 'TOKENS', endpoint: '/overview/overview-tokens-table-data', expiration: 5 },
  { key: 'CMC_CATAGORIES', endpoint: '/overview/get-user-catagories', expiration: 5 },
  { key: 'CUSTOM_CATAGORIES', endpoint: '/overview/get-custom-categories', expiration: 5 }
];

const BATCH_SIZE = 3; // Number of concurrent requests
const RETRY_DELAY = 5000; // 5 seconds
const MAX_RETRIES = 3;


export const overviewLoader: LoaderFunction = () => {
  const initialData: Partial<LoaderData> = {};

  ENDPOINT_CONFIGS.forEach(config => {
    const cachedData = getCachedData(CACHE_KEYS[config.key]);
    initialData[CACHE_KEYS[config.key] as keyof LoaderData] = {
      data: cachedData?.data || null,
      timestamp: cachedData?.timestamp || 0
    };
  });

  return initialData as LoaderData;
};

const Overview: React.FC = () => {
  const cachedData = useLoaderData() as LoaderData;
  const [overviewData, setOverviewData] = useState<LoaderData>(cachedData);  
  const [nullStates, setNullStates] = useState<ComponentLoadingState>(
    Object.values(CACHE_KEYS).reduce((acc, key) => ({
      ...acc,
      [key]: !cachedData[key as keyof LoaderData]?.data
    }), {} as ComponentLoadingState)
  );  

  const activeFetches = useActiveFetches();

  const fetchDataWithRetry = useCallback(async (
    config: EndpointConfig,
    retryCount = 0
  ): Promise<any> => {
    try {
      if (isEndpointFetching(activeFetches.current, config.endpoint)) {
        return null;
      }

      activeFetches.current.add(config.endpoint);
      const response = await api.get(config.endpoint);

      return {
        key: config.key,
        data: response,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`Error fetching ${config.key}:`, error);

      if (retryCount < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return fetchDataWithRetry(config, retryCount + 1);
      }

      return null;
    } finally {
      activeFetches.current.delete(config.endpoint);
    }
  }, [activeFetches]);

  const updateExpiredData = useCallback(async () => {
    const expiredConfigs = ENDPOINT_CONFIGS.filter(config => {
      const currentData = overviewData[CACHE_KEYS[config.key] as keyof LoaderData];
      return nullStates[CACHE_KEYS[config.key] as keyof ComponentLoadingState] ||
        isDataExpired(currentData?.timestamp || 0, config.expiration);
    });

    if (expiredConfigs.length === 0) return;

    // Process in batches
    for (let i = 0; i < expiredConfigs.length; i += BATCH_SIZE) {
      const batch = expiredConfigs.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(batch.map(config => fetchDataWithRetry(config)));

      const validResults = results.filter((result): result is { key: keyof typeof CACHE_KEYS, data: any, timestamp: number } => Boolean(result));
      
      if (validResults.length > 0) {
        setOverviewData(prev => {
          const newData = { ...prev };
          validResults.forEach(result => {
            const key = CACHE_KEYS[result.key];
            newData[key] = {
              data: result.data,
              timestamp: result.timestamp
            };
            localStorage.setItem(CACHE_KEYS[result.key], JSON.stringify(newData[key]));
          });
          return newData;
        });
      
        setNullStates(prev => {
          const newStates = { ...prev };
          validResults.forEach(result => {
            newStates[CACHE_KEYS[result.key] as keyof ComponentLoadingState] = false;
          });
          return newStates;
        });
      }
    }
  }, [overviewData, nullStates, fetchDataWithRetry]);

  useEffect(() => {
    updateExpiredData();
    const intervalId = setInterval(updateExpiredData, 60000);
    return () => clearInterval(intervalId);
  }, [updateExpiredData]);

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
            isNull={{
              market: nullStates.market,
              fearGreed: nullStates.fearGreed
            }}
          />
        </div>
      </div>
      <div className="page-content">
        <div className="overview-wrapper">
          <div className="main-content">
            <section className="coinglass-data-bar">
              <CoinglassMetricsBar
                data={overviewData.cglsScrapeData.data?.data}
                isNull={nullStates.cglsScrapeData}
              />
              <TotalWorth
                wallets={overviewData.wallets.data}
                isNull={nullStates.wallets}
              />
            </section>
            <section className="overview-token-table">
              <OverviewTokensTable
                tokens={overviewData.TokenOverviewData.data}
                isNull={nullStates.TokenOverviewData}
              />
              <CryptoCategoriesSidebar
                categories={overviewData.userCategories.data}
                customCategories={overviewData.customCategories.data}
                isNull={nullStates.userCategories}
              />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;