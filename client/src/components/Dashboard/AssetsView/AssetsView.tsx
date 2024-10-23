import React from "react";
import "./AssetsView.css";
import MetricCard from "../../overview/MetricCard";
import { components } from "../../../types/api-types";
import AssetOverviewSidebar from "../AssetsView/AssetOverviewSidebar";
import { Settings2, CirclePlus } from "lucide-react"; 

type Wallet = components['schemas']['Wallet']

interface AssetViewProps {
  wallets: Wallet[];
}

export interface Asset {
  name: string;
  value: number;
  change: number;
  amount: number;
  price: number;
}

const AssetsView: React.FC<AssetViewProps> = ({wallets}) => {
  const totalValuePerAsset = wallets.reduce((acc, wallet) => {
    wallet.tokens.forEach(token => {
      if (!acc[token.name]) {
        acc[token.name] = { value: 0, change24h: 0, amount: 0, price: 0 };
      }
      acc[token.name].value += token.value;
      acc[token.name].change24h += token.change24h;
      acc[token.name].amount += token.amount;
      acc[token.name].price = token.price;
    });
    return acc;
  }, {} as Record<string, { value: number, change24h: number, amount: number, price: number }>);

  const totalValueArray: Asset[] = Object.entries(totalValuePerAsset).map(([name, data]) => ({
    name,
    value: data.value,
    change: data.change24h,
    amount: data.amount,
    price: data.price
    }));

  console.log(totalValueArray);

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
          {totalValueArray.map((asset, index) => {
            return (
              <MetricCard
                key={index}
                title={asset.name}
                value={String(asset.value)}
                change={ `${String(asset.change.toFixed(2))}%` }
                amount={String(asset.amount)}
              />
            );
          })}
        </div>

        {/* <AssetBreakdown name={"Other Assets"} assets={assetOverviewPortfolio} /> */}
      </div>
      <div className="asset-overview-sidebar">
        <AssetOverviewSidebar assets={totalValueArray} />
      </div>
    </div>
  );
};

export default AssetsView;
