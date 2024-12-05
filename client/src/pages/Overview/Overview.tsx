import React, { useState, useEffect } from "react";
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
import { api } from "../../utils/api";
import { useActiveFetches, isEndpointFetching } from "../../context/ActiveFetchesContext";

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
  MARKET: '/overview/cryptostats',
  FEAR_GREED: '/overview/feargreedindex',
  WALLETS: '/wallets/get_wallets',
  CGLS: '/overview/get-scraped-CGLS-data',
  TOKEN_OVERVIEW: '/overview/overview-tokens-table-data',
  CG_CATAGORIES: '/overview/get-crypto-catagories',
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
  const [overviewData, setOverviewData] = useState<LoaderData>(cachedData);
  const [nullStates, setNullStates] = useState<ComponentLoadingState>({
    market: !cachedData.marketData.data,
    fearGreed: !cachedData.fearGreedData.data,
    wallets: !cachedData.wallets.data,
    cglsScrapeData: !cachedData.cglsScrapeData.data,
    TokenOverviewData: !cachedData.TokenOverviewData.data,
    cgCategories: !cachedData.cgCategories.data
  });

  const activeFetches = useActiveFetches();

  const updateExpiredData = async () => {
    const updates: Promise<void>[] = [];
    const newData = { ...overviewData };

    if (nullStates.wallets || isDataExpired(overviewData.wallets.timestamp || 0)) {
      if (!isEndpointFetching(activeFetches.current, API_ENDPOINTS.WALLETS)) {
        activeFetches.current.add(API_ENDPOINTS.WALLETS);
        updates.push(
          api.get(API_ENDPOINTS.WALLETS)
            .then(wallets => {
              newData.wallets = {
                data: wallets,
                timestamp: Date.now()
              };
              localStorage.setItem(CACHE_KEYS.WALLETS, JSON.stringify(newData.wallets));
              setNullStates(prev => ({ ...prev, wallets: false }));
            })
            .catch(error => {
              console.error('Error fetching wallets:', error);
              if (nullStates.wallets) {
                setNullStates(prev => ({ ...prev, wallets: true }));
              } else {
                setNullStates(prev => ({ ...prev, wallets: false }));
              }
              activeFetches.current.delete(API_ENDPOINTS.WALLETS);
            })
            .finally(() => {
              activeFetches.current.delete(API_ENDPOINTS.WALLETS);
            }
            )
        );
      }
    }

    if (nullStates.market || isDataExpired(overviewData.marketData.timestamp || 0)) {
      if (!isEndpointFetching(activeFetches.current, API_ENDPOINTS.MARKET)) {
        activeFetches.current.add(API_ENDPOINTS.MARKET);
        updates.push(
          api.get(API_ENDPOINTS.MARKET)
            .then(marketData => {
              newData.marketData = {
                data: marketData,
                timestamp: Date.now()
              };
              localStorage.setItem(CACHE_KEYS.MARKET, JSON.stringify(newData.marketData));
              setNullStates(prev => ({ ...prev, market: false }));
            })
            .catch(error => {
              console.error('Error fetching market data:', error);
              if (nullStates.market) {
                setNullStates(prev => ({ ...prev, market: true }));
              }
              setNullStates(prev => ({ ...prev, market: false }));
              activeFetches.current.delete(API_ENDPOINTS.WALLETS);
            })
            .finally(() => {
              activeFetches.current.delete(API_ENDPOINTS.MARKET);
            }
            )
        );
      }
    }

    if (nullStates.fearGreed || isDataExpired(overviewData.fearGreedData.timestamp || 0)) {
      if (!isEndpointFetching(activeFetches.current, API_ENDPOINTS.FEAR_GREED)) {
        activeFetches.current.add(API_ENDPOINTS.FEAR_GREED);
        updates.push(
          api.get(API_ENDPOINTS.FEAR_GREED)
            .then(fearGreedData => {
              newData.fearGreedData = {
                data: fearGreedData,
                timestamp: Date.now()
              };
              localStorage.setItem(CACHE_KEYS.FEAR_GREED, JSON.stringify(newData.fearGreedData));
              setNullStates(prev => ({ ...prev, fearGreed: false }));
            })
            .catch(error => {
              console.error('Error fetching fear/greed data:', error);
              if (nullStates.fearGreed) {
                setNullStates(prev => ({ ...prev, fearGreed: true }));
              }
              setNullStates(prev => ({ ...prev, fearGreed: false }));
              activeFetches.current.delete(API_ENDPOINTS.WALLETS);
            })
            .finally(() => {
              activeFetches.current.delete(API_ENDPOINTS.FEAR_GREED);
            }
            )
        );
      }
    }

    if (nullStates.cglsScrapeData || isDataExpired(overviewData.cglsScrapeData.timestamp || 0)) {
      if (!isEndpointFetching(activeFetches.current, API_ENDPOINTS.CGLS)) {
        activeFetches.current.add(API_ENDPOINTS.CGLS);
        updates.push(
          api.get(API_ENDPOINTS.CGLS)
            .then(cglsData => {
              newData.cglsScrapeData = {
                data: cglsData,
                timestamp: Date.now()
              };
              localStorage.setItem(CACHE_KEYS.CGLS, JSON.stringify(newData.cglsScrapeData));
              setNullStates(prev => ({ ...prev, cglsScrapeData: false }));
            })
            .catch(error => {
              console.error('Error fetching CGLS data:', error);
              if (nullStates.cglsScrapeData) {
                setNullStates(prev => ({ ...prev, cglsScrapeData: true }));
              }
              setNullStates(prev => ({ ...prev, cglsScrapeData: false }));
              activeFetches.current.delete(API_ENDPOINTS.WALLETS);
            })
            .finally(() => {
              activeFetches.current.delete(API_ENDPOINTS.CGLS);
            }
            )
        );
      }
    }

    if (nullStates.TokenOverviewData || isDataExpired(overviewData.TokenOverviewData.timestamp || 0)) {
      if (!isEndpointFetching(activeFetches.current, API_ENDPOINTS.TOKEN_OVERVIEW)) {
        activeFetches.current.add(API_ENDPOINTS.TOKEN_OVERVIEW);
        updates.push(
          api.get(API_ENDPOINTS.TOKEN_OVERVIEW)
            .then(tokenData => {
              newData.TokenOverviewData = {
                data: tokenData,
                timestamp: Date.now()
              };
              localStorage.setItem(CACHE_KEYS.TOKENS, JSON.stringify(newData.TokenOverviewData));
              setNullStates(prev => ({ ...prev, TokenOverviewData: false }));
            })
            .catch(error => {
              console.error('Error fetching token overview data:', error);
              if (nullStates.TokenOverviewData) {
                setNullStates(prev => ({ ...prev, TokenOverviewData: true }));
              }
              setNullStates(prev => ({ ...prev, TokenOverviewData: false }));
              activeFetches.current.delete(API_ENDPOINTS.WALLETS);
            })
            .finally(() => {
              activeFetches.current.delete(API_ENDPOINTS.TOKEN_OVERVIEW);
            }
            )
        );
      }
    }

    if (nullStates.cgCategories || isDataExpired(overviewData.cgCategories.timestamp || 0)) {
      if (!isEndpointFetching(activeFetches.current, API_ENDPOINTS.CG_CATAGORIES)) {
        activeFetches.current.add(API_ENDPOINTS.CG_CATAGORIES);
        updates.push(
          api.get(API_ENDPOINTS.CG_CATAGORIES)
            .then(categories => {
              newData.cgCategories = {
                data: categories,
                timestamp: Date.now()
              };
              localStorage.setItem(CACHE_KEYS.CG_CATAGORIES, JSON.stringify(newData.cgCategories));
              setNullStates(prev => ({ ...prev, cgCategories: false }));
            })
            .catch(error => {
              console.error('Error fetching cg categories:', error);
              if (nullStates.cgCategories) {
                setNullStates(prev => ({ ...prev, cgCategories: true }));
              }
              setNullStates(prev => ({ ...prev, cgCategories: false }));
              activeFetches.current.delete(API_ENDPOINTS.WALLETS);
            })
            .finally(() => {
              activeFetches.current.delete(API_ENDPOINTS.CG_CATAGORIES);
            }
            )
        );
      }
    }

    if (updates.length > 0) {
      try {
        await Promise.all(updates);
        setOverviewData(newData);
      } catch (error) {
        console.error('Error updating data:', error);
      }
    }
  };

  useEffect(() => {
    updateExpiredData();
    const intervalId = setInterval(() => {
      updateExpiredData();
    }, 60000); // 60000ms = 1 minute

    return () => clearInterval(intervalId);
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
              <CoinglassMetricsBar data={overviewData.cglsScrapeData.data} isNull={nullStates.cglsScrapeData} />
              <TotalWorth
                wallets={overviewData.wallets.data}
                isNull={nullStates.wallets}
              />
            </section>
            <section className="overview-token-table">
              <OverviewTokensTable tokens={overviewData.TokenOverviewData.data} isNull={nullStates.TokenOverviewData} />
              <CryptoCategoriesSidebar categories={overviewData.cgCategories.data} isNull={nullStates.cgCategories} />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;