// src/components/Overview/Overview.tsx
import React from "react";
import "./Overview.css";
import MetricCard from "../components/overview/MetricCard";
import PieChart from "../components/overview/PieChart";

const Overview: React.FC = () => {
  return (
    <div className="default-page">
      <div className="page-header">
        <h1>Market Overview</h1>
      </div>
      <div className="page-content">
        <div className="crypto-dashboard">
          <div className="content-header">
            <div className="overview-time-marker">24H</div>
          </div>

          <div className="dashboard-grid">
            <MetricCard
              title="Total Market Cap"
              value="$2.22T"
              change="2.50%"
            />
            <MetricCard title="Bitcoin Price" value="$63,630" change="2.61%" />
            <MetricCard
              title="Bitcoin Market Cap"
              value="$1.26T"
              change="2.61%"
            />
            <MetricCard
              title="Bitcoin Dominance"
              value="56.65%"
              change="0.03%"
            />
            <MetricCard
              title="Trading Volume"
              value="$394.95B"
              change="29.62%"
            />
            <div className="metric-card">
              <h3>Gainers vs. Losers</h3>
              <PieChart value1={25} value2={75} />
            </div>
            <div className="fear-greed-chart">
              <img
                src="https://alternative.me/crypto/fear-and-greed-index.png"
                alt="Latest Crypto Fear & Greed Index"
                height={230}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
