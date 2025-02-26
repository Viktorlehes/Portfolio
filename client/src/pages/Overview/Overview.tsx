import React from "react";
import { LoaderFunction, useLoaderData } from "react-router-dom";
import "./Overview.css";
import CryptoCategoriesSidebar from "../../components/overview/Categories/CryptoCategorieList";
import CryptoStatsBar from '../../components/overview/CryptoStatsBar';
import { components } from "../../types/api-types";
import CoinglassMetricsBar from "../../components/overview/CoinglassMetricBar";
import TotalWorth from "../../components/overview/TotalWorth";
import { OverviewTokensTable } from "../../components/overview/OverviewTokensTable";
import { useDataFetching, FetchState, ENDPOINTS } from "../../utils/api";

type MarketStats = components['schemas']['MarketStats'];
type FearGreadData = components['schemas']['FearGreadData'];
type Wallet = components["schemas"]["UnifiedWallet"];
type CoinglassMetrics = components['schemas']['CoinglassMetrics'];
type CategoryData = components['schemas']['UserCategories'];
type UnifiedToken = components['schemas']['UnifiedToken']
type CoinglassMetricsResponse = FetchState<CoinglassMetrics>;

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
  const tokenTableState = useDataFetching<UnifiedToken[]>(ENDPOINTS.TOKENS);
  const walletState = useDataFetching<Wallet[]>({
    ...ENDPOINTS.WALLETS,
    initialData: cachedWallets
  });
  const marketState = useDataFetching<MarketStats>(ENDPOINTS.MARKET);
  const fearGreedState = useDataFetching<FearGreadData>(ENDPOINTS.FEAR_GREED);
  const categoriesState = useDataFetching<CategoryData>(ENDPOINTS.CATEGORIES);
  const cglsScrapeDataState = useDataFetching<CoinglassMetricsResponse>(ENDPOINTS.CGLS_SCRAPE);

  const handleTokenTableRefetch = async () => {
    await tokenTableState.refetch();
  }    

  return (
    <div className="default-page">
      <div className="overview-page-header">
        <div className="overview-main-header-content">
          <h1>Market Overview</h1>
        </div>
        <div>
          <CryptoStatsBar
            cryptoStats={marketState}
            feargreedData={fearGreedState}
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
                tokens={tokenTableState.data || null}
                isNull={tokenTableState.isLoading || tokenTableState.error ? true : false}
                reFetch={handleTokenTableRefetch}
              />
              <CryptoCategoriesSidebar
                categories={categoriesState}
              />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;