import React from 'react';
import './OverviewAssetBreakdown.css';
import { Asset } from '../../data/dashboarddata';
import { formatCurrency } from '../../utils/calc';

interface AssetBreakdownProps {
  name: string;
  assets: Asset[];
}

const AssetBreakdown: React.FC<AssetBreakdownProps> = ({ name, assets }) => {
  
  // Calculate the total value of all assets
  const totalAmount = assets.reduce((total, asset) => total + asset.value, 0);

  // Calculate percentage for each asset
  const assetsWithPercentage = assets.map(asset => ({
    ...asset,
    percentage: ((asset.value / totalAmount) * 100).toFixed(2) // Round to 2 decimal places
  }));

  return (
    <div className="asset-breakdown">
      <div className="asset-breakdown-header">
        <h2>{name}</h2>
        <a href="#" className="view-more">View more &gt;</a>
      </div>
      <div className="asset-total">
        <span>{formatCurrency(totalAmount, 0, 0)}</span>
      </div>
      <div className="asset-bar">
        {assetsWithPercentage.map((asset, index) => (
          <div
            key={index}
            style={{ width: `${asset.percentage}%`, backgroundColor: asset.color }}
          ></div>
        ))}
      </div>
      <div className="asset-list">
        {assetsWithPercentage.map((asset, index) => (
          <div key={index} className="asset-item">
            <div className="asset-name">
              <div className="asset-color" style={{ backgroundColor: asset.color }}></div>
              <span>{asset.name}</span>
            </div>
            <div className="asset-value">
              <span>{formatCurrency(asset.value, 0, 0)}</span>
              <span className="asset-percentage">{asset.percentage}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AssetBreakdown;
