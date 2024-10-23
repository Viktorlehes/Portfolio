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
import chart1image from "../../assets/chart1.png";
import chart2image from "../../assets/chart2.png";
import chart3image from "../../assets/chart3.png";
import chart4image from "../../assets/chart4.png";
import { LoaderFunction, useLoaderData } from "react-router-dom";

export interface ValueChange {
  value: string;
  change: string;
}

export interface CryptoStats {
  cryptos: string;
  exchanges: string;
  market_cap: ValueChange;
  "24h_vol": ValueChange;
  dominance_btc: string;
  dominance_eth: string;
  eth_gas: string;
  fear_greed: string;
}

// Utility function to check if the data is expired
const isDataExpired = (timestamp: number, maxAgeInMinutes: number) => {
  const now = new Date().getTime();
  const ageInMinutes = (now - timestamp) / (1000 * 60);
  return ageInMinutes > maxAgeInMinutes;
};

// React Router loader function
export const cryptoStatsLoader: LoaderFunction = async () => {
  const localStorageKey = 'cryptoStats';
  const storedData = localStorage.getItem(localStorageKey);

  if (storedData) {
    const parsedData = JSON.parse(storedData);
    const { timestamp, data } = parsedData;

    // Check if data is older than 10 minutes
    if (!isDataExpired(timestamp, 10)) {
      return data; // Return cached data if it's not expired
    }
  }

  // If no valid cached data, fetch from the FastAPI backend
  try {
    const response = await fetch('http://127.0.0.1:8000/overview/cryptostats'); // Adjust the URL to match your FastAPI endpoint
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.statusText}`);
    }

    const data = await response.json();

    // Store fetched data along with a new timestamp in localStorage
    const currentTime = new Date().getTime();
    localStorage.setItem(localStorageKey, JSON.stringify({ data, timestamp: currentTime }));

    return data;
  } catch (error) {
    console.error('Error fetching crypto stats:', error);
    throw new Error('Could not load crypto stats'); // This error will propagate to a route error boundary if you have one
  }
};

const Overview: React.FC = () => {
  const cryptoStats = useLoaderData() as CryptoStats;

  return (
    <div className="default-page">
      <div className="overview-page-header">
        <div className="overview-main-header-content">
          <h1>Market Overview</h1>
          <CustomNavbar />
        </div>
        <div>
          <CryptoStats cryptoStats={cryptoStats} />
        </div>
      </div>
      <div className="page-content">
        <div className="overview-wrapper">
          <div className="main-content">
            <div className="dashboard-grid">
              <div className="dashboard-grid-item">
                <MetricCard
                  title="Total Market Cap"
                  value={`$${cryptoStats.market_cap.value}`}
                  change={`${cryptoStats.market_cap.change}%`}
                  chart={chart1image}
                />
              </div>
              <div className="dashboard-grid-item">
                <MetricCard
                  title="Bitcoin Market Cap"
                  value="$1.26T"
                  change="2.61%"
                  chart={chart2image}
                />
              </div>
              <div className="dashboard-grid-item">
                <MetricCard
                  title="Bitcoin Dominance"
                  value={`${cryptoStats.dominance_btc}%`}
                  chart={chart3image}
                />
              </div>
              <div className="dashboard-grid-item">
                <MetricCard
                  title="Trading Volume"
                  value={`$${cryptoStats["24h_vol"].value}`}
                  change={`$${cryptoStats["24h_vol"].change}`}
                  chart={chart4image}
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
