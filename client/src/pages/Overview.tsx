// src/components/Overview/Overview.tsx
import React from "react";
import "./Overview.css";
import MetricCard from "../components/overview/MetricCard";
import CryptoCatagorieList from "../components/overview/CryptoCatagorieList";
import { Category } from "../components/overview/CryptoCatagorieList";
import Linechart from "../components/Dashboard/Linechart";
import ValueCard from "../components/Dashboard/ValueCard";
import AssetBreakdown from "../components/Dashboard/AssetBreakdown";
import { assetsPortfolio1, assetsPortfolio2, assetsPortfolio3, data } from '../data/dashboarddata';
import chart1image from "../assets/chart1.png";
import chart2image from "../assets/chart2.png";
import chart3image from "../assets/chart3.png";
import chart4image from "../assets/chart4.png";

const categories: Category[] = [
  {
    name: "Payment Tokens",
    average_price_change: "-2.49%",
    crypto_names: ["BTC", "LTC", "BCH"],
  },
  {
    name: "Stablecoins",
    average_price_change: "+0.1%",
    crypto_names: ["USDT", "USDC", "BUSD"],
  },
  {
    name: "DeFi Tokens",
    average_price_change: "+4.7%",
    crypto_names: ["UNI", "AAVE", "COMP"],
  },
  {
    name: "Smart Contract Platforms",
    average_price_change: "-0.33%",
    crypto_names: ["ETH", "SOL", "DOT"],
  },
  {
    name: "NFT Ecosystem Tokens",
    average_price_change: "+1.95%",
    crypto_names: ["FLOW", "ENJ", "MANA"],
  },
];

const Overview: React.FC = () => {
  return (
    <div className="default-page">
      <div className="page-header">
        <h1>Market Overview</h1>
      </div>
      <div className="page-content">
        <nav className="overview-navbar">
          <a href="https://coinmarketcap.com/">Coinmarketcap </a>
          <a href="https://studio.glassnode.com/home">Glassnode</a>
          <a href="https://parsec.fi/dashboard">Parsec</a>
          <a href="https://app.tokenmetrics.com/en/market">TokenMetrics</a>
          <a href="https://app.intellectia.ai/crypto">Intellectia</a>
        </nav>
        <div className="overview-wrapper">
          <div className="main-content">
            <div className="dashboard-grid">
              <div className="dashboard-grid-item">
                <MetricCard
                  title="Total Market Cap"
                  value="$2.22T"
                  change="2.50%"
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
                  value="56.65%"
                  change="0.03%"
                  chart={chart3image}
                />
              </div>
              <div className="dashboard-grid-item">
                <MetricCard
                  title="Trading Volume"
                  value="$394.95B"
                  change="29.62%"
                  chart={chart4image}
                />
              </div>
            </div>
            <section className="dashboard-head">
              <div className="overview-values">
                <ValueCard label="Coinbase" value={85800} color="#8884d8" />
                <ValueCard label="Nexo" value={61300} color="#82ca9d" />
                <ValueCard label="Uniswap" value={51500} color="#ffc658" />
              </div>
            </section>

            <Linechart data={data} />

            <section className="dashboard-sub-cat">
              <AssetBreakdown name={"Coinbase"} assets={assetsPortfolio1} />
              <AssetBreakdown name={"Nexo"} assets={assetsPortfolio2} />
              <AssetBreakdown name={"Uniswap"} assets={assetsPortfolio3} />
            </section>
          </div>
          <div className="catagorie-overview">
            <CryptoCatagorieList categories={categories} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
