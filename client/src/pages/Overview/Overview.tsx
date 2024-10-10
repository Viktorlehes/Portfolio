// src/components/Overview/Overview.tsx
import React from "react";
import "./Overview.css";
import MetricCard from "../../components/overview/MetricCard";
import CustomNavbar from "../../components/Default/CustomNavBar";
import CryptoCategoriesSidebar from "../../components/overview/CryptoCatagorieList";
import { testCategories } from "../../data/dashboarddata";
import AssetBreakdown from "../../components/Dashboard/WalletsView/AssetBreakdown";
import { assetsPortfolio1 } from '../../data/dashboarddata'
import chart1image from "../../assets/chart1.png";
import chart2image from "../../assets/chart2.png";
import chart3image from "../../assets/chart3.png";
import chart4image from "../../assets/chart4.png";

const Overview: React.FC = () => {
  return (
    <div className="default-page">
      <div className="page-header">
        <h1>Market Overview</h1>
        <CustomNavbar />
      </div>
      <div className="page-content">
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
