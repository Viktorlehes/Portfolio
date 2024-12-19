import React from "react";
import { LoaderFunction, useLoaderData } from "react-router-dom";
import "./Overview.css";
import CustomNavbar from "../../components/Default/CustomNavBar";
import CryptoCategoriesSidebar from "../../components/overview/Categories/CryptoCategorieList";
import CryptoStatsBar from '../../components/overview/CryptoStatsBar';
import { components } from "../../types/api-types";
import CoinglassMetricsBar from "../../components/overview/CoinglassMetricBar";
import TotalWorth from "../../components/overview/TotalWorth";
import { OverviewTokensTable } from "../../components/overview/OverviewTokensTable";
import { useDataFetching, FetchState, ENDPOINTS } from "../../utils/api";

type MarketData = components["schemas"]["MarketDataResponse"];
type FearGreedResponse = components["schemas"]["FearGreedResponse"];
type Wallet = components["schemas"]["Wallet"];
type CoinglassMetrics = components['schemas']['CoinglassMetrics'];
type TokenOverviewResponse = components['schemas']['TokenOverviewData'];
type CategoryData = components['schemas']['CategoryData'];
type CustomCategory = components['schemas']['CustomCategory'];

type TokenTableResponse = FetchState<TokenOverviewResponse[]>;
type CoinglassMetricsResponse = FetchState<CoinglassMetrics>;
type CategoryResponse = FetchState<CategoryData[]>;
type CustomCategoryResponse = FetchState<CustomCategory[]>;

interface LoaderData {
  wallets: {
    data: Wallet[] | null;
    timestamp: number;
  }
}

export const overviewLoader: LoaderFunction = () => {
  const cachedWallets = localStorage.getItem('/wallets/get_wallets');
  
  const initialData: LoaderData = {
    wallets: {
      data: cachedWallets ? JSON.parse(cachedWallets).data : null,
      timestamp: cachedWallets ? JSON.parse(cachedWallets).timestamp : 0
    }
  };

  return initialData;
};

const Overview: React.FC = () => {
  const { wallets: cachedWallets } = useLoaderData() as LoaderData;
  const tokenState = useDataFetching<TokenTableResponse>(ENDPOINTS.TOKENS);
  const walletState = useDataFetching<Wallet[]>({
    ...ENDPOINTS.WALLETS,
    initialData: cachedWallets
  });
  const marketState = useDataFetching<MarketData>(ENDPOINTS.MARKET);
  const fearGreedState = useDataFetching<FearGreedResponse>(ENDPOINTS.FEAR_GREED);
  const categoriesState = useDataFetching<CategoryResponse>(ENDPOINTS.CATEGORIES);
  const customCategoriesState = useDataFetching<CustomCategoryResponse>(ENDPOINTS.CUSTOM_CATEGORIES);  
  const cglsScrapeDataState = useDataFetching<CoinglassMetricsResponse>(ENDPOINTS.CGLS_SCRAPE);

  const handleTokenTableRefetch = async () => {
    await tokenState.refetch();
  }

  return (
    <div className="default-page">
      <div className="overview-page-header">
        <div className="overview-main-header-content">
          <h1>Market Overview</h1>
          <CustomNavbar />
        </div>
        <div>
          <CryptoStatsBar
            cryptoStats={marketState.data}
            feargreeddata={fearGreedState.data}
            isNull={{
              market: marketState.isLoading,
              fearGreed: fearGreedState.isLoading
            }}
          />
        </div>
      </div>
      <div className="page-content">
        <div className="overview-wrapper">
          <div className="main-content">
            <section className="coinglass-data-bar">
              <CoinglassMetricsBar
                data={cglsScrapeDataState.data && cglsScrapeDataState.data.data || null}
                isNull={cglsScrapeDataState.isLoading}
              />
              <TotalWorth
                wallets={walletState.data}
                isNull={walletState.isLoading}
              />
            </section>
            <section className="overview-token-table">
              <OverviewTokensTable
                tokens={tokenState.data && tokenState.data?.data || []}
                isNull={tokenState.isLoading}
                reFetch={handleTokenTableRefetch}
              />
              <CryptoCategoriesSidebar
                categories={categoriesState.data && categoriesState.data.data || []}
                customCategories={customCategoriesState.data && customCategoriesState.data.data || []}
                isNull={customCategoriesState.isLoading}
              />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;