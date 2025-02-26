import React from 'react';
import './AssetOverviewSidebar.css'
import { Asset } from './AssetsView';
import { CircleDollarSign } from 'lucide-react';

interface AssetOverviewSidebarProps {
  assets: Asset[]
}

const AssetOverviewSidebar: React.FC<AssetOverviewSidebarProps> = ({ assets }) => {
  assets = assets.filter(ast => ast.value > 1)

  const topEarners: Asset[] = assets.filter(ast => ast.change >= 0)
    .sort((a, b) => b.change - a.change)
    .slice(0, 5);

  const topLosers: Asset[] = assets.filter(ast => ast.change < 0)
    .sort((a, b) => a.change - b.change)
    .slice(0, 5);

  function formatNumber(value: number): string {
    const strValue = Math.abs(value).toString();
    const digitsBeforeDecimal = strValue.split('.')[0].length;

    if (digitsBeforeDecimal > 3) {
      return value.toFixed(1);
    } else if (digitsBeforeDecimal > 2) {
      return value.toFixed(2);
    }
    return value.toFixed(2);
  }

  const AssetOverview: React.FC<{ assets: Asset[], title: string }> = ({ assets, title }) => (
    <div className="overview-category">
      <h3>{title}</h3>
      <div className="overview-header">
        <span>Name</span>
        <span>Value</span>
        <span>Price</span>
        <span>24h</span>
      </div>
      {assets.map((asset, index) => (
        <div key={index} className="overview-row">
          <span className="asset-name">{asset.icon ? <img src={asset.icon} alt={asset.name} className="icon" /> : <CircleDollarSign />}{asset.symbol}</span>
          <span>${formatNumber(asset.value)}</span>
          <span>${formatNumber(asset.price)}</span>
          <span className={`overview-change ${asset.change >= 0 ? 'positive' : 'negative'}`}>
            {asset.change >= 0 ? '+' : ''}{asset.change.toFixed(2)}%
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="asset-overview-container">
      {topEarners.length > 0 && <AssetOverview assets={topEarners} title="Top Earners" />}
      {topLosers.length > 0 && <AssetOverview assets={topLosers} title="Top Losers" />}
    </div>
  );
};

export default AssetOverviewSidebar;