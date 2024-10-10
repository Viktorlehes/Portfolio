import React from "react";
import Linechart from "./Linechart";
import ValueCard from "./ValueCard";
import AssetBreakdown from "./AssetBreakdown";
import { Asset } from "../../../data/dashboarddata";
import { Datapoint } from "../../../data/dashboarddata";
import { Pencil } from "lucide-react";
import './WalletsView.css'

interface WalletsViewProps {
  assetsPortfolio1: Asset[];
  assetsPortfolio2: Asset[];
  assetsPortfolio3: Asset[];
  data: Datapoint[];
}

const WalletsView: React.FC<WalletsViewProps> = ({
  assetsPortfolio1,
  assetsPortfolio2,
  assetsPortfolio3,
  data,
}) => {
  return (
    <div>
      <section className="dashboard-head">
        <div className="overview-values">
          <ValueCard label={"Total"} value={152250} color="#000100" />
          <ValueCard label="Coinbase" value={85800} color="#8884d8" />
          <ValueCard label="Nexo" value={61300} color="#82ca9d" />
          <ValueCard label="Uniswap" value={51500} color="#ffc658" />
        </div>
        <div className="overview-edit">
          <button onClick={() => (window.location.href = "/Dashboard/manage")}>
            <Pencil />
          </button>
        </div>
      </section>

      <Linechart data={data} />

      <section className="dashboard-sub-cat">
        <AssetBreakdown name={"Coinbase"} assets={assetsPortfolio1} />
        <AssetBreakdown name={"Nexo"} assets={assetsPortfolio2} />
        <AssetBreakdown name={"Uniswap"} assets={assetsPortfolio3} />
      </section>
    </div>
  );
};

export default WalletsView;
