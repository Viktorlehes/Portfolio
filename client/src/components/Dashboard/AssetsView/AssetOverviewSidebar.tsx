import React from 'react';
import { AssetOverview } from '../../../data/dashboarddata';
import './AssetOverviewSidebar.css'

interface AssetOverviewSidebarProps {
  assets: AssetOverview[]
}

const AssetOverviewSidebar: React.FC<AssetOverviewSidebarProps> = ({ assets }) => {
  const topEarners = assets.filter(ast => parseFloat(ast.change24h) >= 0)
    .sort((a, b) => parseFloat(b.change24h) - parseFloat(a.change24h))
    .slice(0, 5);

  const topLosers = assets.filter(ast => parseFloat(ast.change24h) < 0)
    .sort((a, b) => parseFloat(a.change24h) - parseFloat(b.change24h))
    .slice(0, 5);

  const AssetOverview: React.FC<{ assets: AssetOverview[], title: string }> = ({ assets, title }) => (
    <div className="category-list">
      <h3>{title}</h3>
      <div className="asset-overview-header">
        <span>Name</span>
        <span>Value</span>
        <span>Price</span>
        <span>24h</span>
        <span>7d</span>
      </div>
      {assets.map((asset, index) => (
        <div key={index} className="asset-overview-item">
          <span>{asset.name}</span>
            <span>${asset.totalValue}</span>
        <span>${asset.value}</span> 
          <span className={parseFloat(asset.change24h) >= 0 ? 'positive' : 'negative'}>{asset.change24h}%</span>
          <span className={parseFloat(asset.change7d) >= 0 ? 'positive' : 'negative'}>{asset.change7d}%</span>
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