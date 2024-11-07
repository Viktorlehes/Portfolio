import React from 'react';
import './AssetOverviewSidebar.css'
import { Asset } from './AssetsView';

interface AssetOverviewSidebarProps {
  assets: Asset[]
}

const AssetOverviewSidebar: React.FC<AssetOverviewSidebarProps> = ({ assets }) => {
  const topEarners: Asset[] = assets.filter(ast => ast.change >= 0)
    .sort((a, b) => b.change - a.change)
    .slice(0, 5);

  const topLosers: Asset[] = assets.filter(ast => ast.change < 0)
    .sort((a, b) => a.change - b.change)
    .slice(0, 5);

  const AssetOverview: React.FC<{ assets: Asset[], title: string }> = ({ assets, title }) => (
    <div className="category-list">
      <h3>{title}</h3>
      <div className="asset-overview-header">
        <span>Name</span>
        <span>Value</span>
        <span>Price</span>
        <span>24h</span>
        {/* <span>7d</span> */}
      </div>
      {assets.map((asset, index) => (
        <div key={index} className="asset-overview-item">
          <span>{asset.name}</span>
          <span>${asset.value.toFixed(2)}</span>
          <span>${asset.price.toFixed(2)}</span> 
          <span className={asset.change >= 0 ? 'positive' : 'negative'}>{asset.change.toFixed(2)}%</span>
          {/* <span className={asset.change7d >= 0 ? 'positive' : 'negative'}>{asset.change7d}%</span> */}
        </div>
      ))}
    </div>
  );

  return (
    <div className="crypto-categories-sidebar">
      <h2>Assets</h2>
      <AssetOverview assets={topEarners} title="Top Earners" />
      <AssetOverview assets={topLosers} title="Top Losers" />
    </div>
  );
};

export default AssetOverviewSidebar;