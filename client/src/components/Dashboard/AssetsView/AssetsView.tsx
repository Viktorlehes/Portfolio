import React from "react";
import "./AssetsView.css";
import MetricCard from "../../overview/MetricCard";
import chart1image from "../../../assets/chart1.png";
import chart2image from "../../../assets/chart2.png";
import chart3image from "../../../assets/chart3.png";
import chart4image from "../../../assets/chart4.png";
import AssetBreakdown from "../WalletsView/AssetBreakdown";
import AssetOverviewSidebar from "../AssetsView/AssetOverviewSidebar";
import { testAssetOverviewData } from "../../../data/dashboarddata";
import { assetOverviewPortfolio } from "../../../data/dashboarddata";
import { Settings2, CirclePlus } from "lucide-react";

const AssetsView: React.FC = () => {
  return (
    <div className="asset-overview-wrapper">
      <div className="main-content">

        <div className="asset-nav">
            <h2>Main Assets</h2>
            <div>
                <CirclePlus />
                <Settings2 />
            </div>
        </div>
        <div className="asset-dashboard-grid">
          <MetricCard
            title="Bitcoin (BTC)"
            value="$187,234"
            change="-6.78%"
            chart={chart1image}
          />

          <MetricCard
            title="Ethereum (ETH)"
            value="$119,574"
            change="-4.67%"
            chart={chart2image}
          />

          <MetricCard
            title="Tether (USDT)"
            value="57,234"
            change="0.03%"
            chart={chart3image}
          />

          <MetricCard
            title="Solana (SOL)"
            value="$7,954"
            change="29.62%"
            chart={chart4image}
          />

          <MetricCard
            title="Solana (SOL)"
            value="$7,954"
            change="29.62%"
            chart={chart4image}
          />

          <MetricCard
            title="XRP (XRP)"
            value="$7,954"
            change="11.62%"
            chart={chart1image}
          />
        </div>
        <AssetBreakdown name={"Other Assets"} assets={assetOverviewPortfolio} />
      </div>
      <div className="asset-overview-sidebar">
        <AssetOverviewSidebar assets={testAssetOverviewData} />
      </div>
    </div>
  );
};

export default AssetsView;
