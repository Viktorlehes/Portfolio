// src/components/Overview/Overview.tsx
import React from "react";
import "./Overview.css";
import MetricCard from "../../components/overview/MetricCard";
import CustomNavbar from "../../components/Default/CustomNavBar";
import CryptoCategoriesSidebar from "../../components/overview/CryptoCatagorieList";
import CryptoStats from '../../components/overview/CryptoStatsBar'
import { testCategories } from "../../data/dashboarddata";
import AssetBreakdown from "../../components/overview/OverviewAssetBreakdown";
import { assetsPortfolio1 } from '../../data/dashboarddata'
import { LoaderFunction, useLoaderData } from "react-router-dom";
import { components } from "../../types/api-types";

type MarketData = components["schemas"]["MarketDataResponse"];
type Token = components["schemas"]["FullToken"];

// Utility function to check if the data is expired
const isDataExpired = (timestamp: number, maxAgeInMinutes: number) => {
  const now = new Date().getTime();
  const ageInMinutes = (now - timestamp) / (1000 * 60);
  return ageInMinutes > maxAgeInMinutes;
};

// React Router loader function
export const cryptoStatsLoader: LoaderFunction = async () => {
  const savedMarketData = localStorage.getItem('marketData');
  const savedTokenData = localStorage.getItem('tokenData');

  if (savedMarketData && savedTokenData) {
    const parsedMarketData = JSON.parse(savedMarketData);
    const parsedTokenData = JSON.parse(savedTokenData);
    const { marketData, marketTimeStamp } = parsedMarketData;
    const { tokenData, tokenTimeStamp} = parsedTokenData;

    if (!isDataExpired(marketTimeStamp, 10) && !isDataExpired(tokenTimeStamp, 10)) {
      return { marketData, tokenData };
    }
  }

  // If no valid cached data, fetch from the FastAPI backend
  try {
    const marketDataResponse = await fetch('http://127.0.0.1:8000/overview/cryptostats');

    const tokenDataResponse = await fetch('http://127.0.0.1:8000/token_via_id/1');
    
    if (!marketDataResponse.ok) {
      throw new Error(`Failed to fetch marketData: ${marketDataResponse.statusText}`);
    }

    if (!tokenDataResponse.ok) {
      throw new Error(`Failed to fetch tokenData: ${tokenDataResponse.statusText}`);
    }

    const marketData: MarketData = await marketDataResponse.json();

    const tokenData: Token = await tokenDataResponse.json();

    const currentTime = new Date().getTime();

    localStorage.setItem("marketData", JSON.stringify({ marketData, marketTimeStamp: currentTime }));

    localStorage.setItem("tokenData", JSON.stringify({ tokenData, tokenTimeStamp: currentTime }));

    return { marketData, tokenData };

  } catch (error) {
    console.error('Error fetching crypto stats:', error);
    throw new Error('Could not load crypto stats'); // This error will propagate to a route error boundary if you have one
  }
};

interface CryptoStatsLoaderData {
  marketData: MarketData;
  tokenData: Token;
}

const Overview: React.FC = () => {
  const loaderData = useLoaderData() as CryptoStatsLoaderData;

  const marketData = loaderData.marketData;
  const tokenData = loaderData.tokenData;

  function formatCurrency (value: number) {
    if (value >= 1e12) {
      return `$${(value / 1e12).toFixed(1)}T`; // Trillions
    } else if (value >= 1e9) {
      return `$${(value / 1e9).toFixed(1)}B`; // Billions
    } else if (value >= 1e6) {
      return `$${(value / 1e6).toFixed(1)}M`; // Millions
    } else if (value >= 1e3) {
      return `$${(value / 1e3).toFixed(1)}K`; // Thousands
    } else {
      return `$${value.toFixed(2)}`; // Smaller values
    }
  }
  return (
    <div className="default-page">
      <div className="overview-page-header">
        <div className="overview-main-header-content">
          <h1>Market Overview</h1>
          <CustomNavbar />
        </div>
        <div>
          <CryptoStats cryptoStats={marketData} />
        </div>
      </div>
      <div className="page-content">
        <div className="overview-wrapper">
          <div className="main-content">
            <div className="dashboard-grid">
              <div className="dashboard-grid-item">
                <MetricCard
                  title="Total Market Cap"
                  value={`${formatCurrency(marketData.data.quote.USD.total_market_cap)}`}
                  change={`${marketData.data.quote.USD.total_market_cap_yesterday_percentage_change.toFixed(2)}%`}
                />
              </div>
              <div className="dashboard-grid-item">
                <MetricCard
                  title="Altcoin Market Cap"
                  value={`${formatCurrency(marketData.data.quote.USD.altcoin_market_cap)}`}
                />
              </div>
              <div className="dashboard-grid-item">
                <MetricCard
                  title="Bitcoin Market Cap"
                  value={`${formatCurrency(tokenData.quote.USD.market_cap)}`}
                  change="2.61%"
                />
              </div>
              <div className="dashboard-grid-item">
                <MetricCard
                  title="Bitcoin Dominance"
                  value={`${marketData.data.btc_dominance.toFixed(2)}%`}
                  change={`${marketData.data.btc_dominance_24h_percentage_change.toFixed(2)}%`}
                />
              </div>
              <div className="dashboard-grid-item">
                <MetricCard
                  title="Trading Volume"
                  value={`${formatCurrency(marketData.data.quote.USD.total_volume_24h)}`}
                  change={`${marketData.data.quote.USD.total_volume_24h_yesterday_percentage_change.toFixed(2)}%`}
                />
              </div>
              <div className="dashboard-grid-item">
                <MetricCard
                  title="Defi Market Cap"
                  value={`${formatCurrency(marketData.data.quote.USD.defi_market_cap)}`}
                  change={`${marketData.data.quote.USD.defi_24h_percentage_change.toFixed(2)}%`}
                />
              </div>
            </div>
            <AssetBreakdown name={'Total Assets'} assets={assetsPortfolio1} />
          </div>
          <div className="catagorie-overview">
            <CryptoCategoriesSidebar categories={testCategories} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
