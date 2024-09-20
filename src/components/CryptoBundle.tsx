import React from 'react';
import { PieChart, Pie, Cell } from 'recharts';
import './CryptoBundle.css';

import DeFi from 'cryptocurrency-icons/32/color/chain.png';
import top from 'cryptocurrency-icons/32/color/btc.png';
import scaling from 'cryptocurrency-icons/32/color/matic.png';

interface Asset {
  name: string;
  percent: number;
  color: string;
}

interface CryptoBundleProps {
  category: string;
  assets: Asset[];
  value: number;
  performance: number;
}

const CryptoBundle: React.FC<CryptoBundleProps> = ({ category, assets, value, performance }) => {
  const getIcon = (name: string) => {
    const icons: { [key: string]: string } = {
      Chainlink: '🔗',
      Bitcoin: '₿',
      Polygon: '⬡',
      Ethereum: 'Ξ',
      Solana: '◎',
      Aave: 'Ⓐ',
      Uniswap: '🦄',
      Synthetix: 'ś',
      Optimism: '⭕',
      Arbitrum: 'Ⓐ',
    };
    return icons[name] || '🪙';
  };

  const getCatIcon = (name: string) => {
    const icons: { [key: string]: string } = {
      'DeFi Tokens': DeFi,
      'Top-Tier Coins': top,
      'Scaling Coins': scaling
    };
    return icons[name];
  }

  const data = assets.map(asset => ({
    name: asset.name,
    value: asset.percent,
  }));

  return (
    <div className="crypto-bundle">
      <div className="bundle-header">
        <div className="bundle-title">
          <img className="bundle-icon" src={getCatIcon(category)} alt='img'></img>
          <h2>{category}</h2>
        </div>
        <div className="bundle-performance">
          <span className={`performance-value ${performance < 0 ? 'negative' : 'positive'}`}>
            {performance.toFixed(2)}%
          </span>
          <p className="performance-period">Last Month</p>
        </div>
      </div>
      
      <p className="bundle-description">
        {category === "DeFi tokens" && "Invest in the future of finance..."}
        {category === "Top-tier coins" && "Own a piece of the most establis..."}
        {category === "Scaling coins" && "Take advantage of the most promi..."}
        <a href="#" className="read-more">Read more</a>
      </p>

      <div className="chart-container">
        <PieChart width={200} height={200}>
          <Pie
            data={data}
            cx={100}
            cy={100}
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={assets[index].color} />
            ))}
          </Pie>
        </PieChart>
        <div className="chart-center">
          <p className="chart-label">Value</p>
          <p className="chart-value">${value.toLocaleString()}</p>
        </div>
      </div>

      <div className="asset-list-bundle">
        {assets.map((asset, index) => (
          <div key={index} className="asset-item-bundle">
            <div 
              className="asset-icon"
              style={{ backgroundColor: asset.color }}
            >
              {getIcon(asset.name)}
            </div>
            <span className="asset-percent-bundle">{asset.percent}%</span>
            <span className="asset-name-bundle">{asset.name}</span>
          </div>
        ))}
      </div>

      <button className="buy-button">Buy</button>
    </div>
  );
};

export default CryptoBundle;