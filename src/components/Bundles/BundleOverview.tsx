import React from 'react';
import { PieChart, Pie, Cell } from 'recharts';
import { CryptoCategory } from '../pages/Bundles';
import './BundleOverview.css';

interface BundleOverviewProps {
  bundles: CryptoCategory[];
}

const BundleOverview: React.FC<BundleOverviewProps> = ({ bundles }) => {
  const totalValue = bundles.reduce((sum, bundle) => sum + bundle.value, 0);
  const data = bundles.map(bundle => ({
    name: bundle.category,
    value: bundle.value,
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];

  return (
    <div className="bundle-overview">
      <h2>Portfolio Overview</h2>
      <div className="overview-content">
        <div className="chart-container">
          <PieChart width={200} height={200}>
            <Pie
              data={data}
              cx={100}
              cy={100}
              innerRadius={60}
              outerRadius={80}
              fill="#8884d8"
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
          <div className="total-value">
            <p>Total Value</p>
            <p className="value">${totalValue.toLocaleString()}</p>
          </div>
        </div>
        <div className="overview-details">
          {bundles.map((bundle, index) => (
            <div key={index} className="bundle-detail-box">
              <div className="bundle-header">
                <span className="bundle-name" style={{ color: COLORS[index % COLORS.length] }}>
                  {bundle.category}
                </span>
                <span className="bundle-value">${bundle.value.toLocaleString()}</span>
              </div>
              <div className="bundle-assets">
                {bundle.assets.map((asset, assetIndex) => (
                  <div key={assetIndex} className="asset-item">
                    <span className="asset-name">{asset.name}</span>
                    <span className="asset-percent">{asset.percent}%</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BundleOverview;