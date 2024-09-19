import React from 'react';
import './CryptoBundle.css';

export interface Asset {
  name: string;
  percent: number;
  color: string;
}

export interface CryptoBundleProps {
  category: string;
  assets: Asset[];
  value: number;
}

const CryptoBundle: React.FC<CryptoBundleProps> = ({ category, assets, value }) => {
  const getIcon = (name: string) => {
    // This is a placeholder. You should replace these with actual icon components or imports
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
    return icons[name] || '🪙'; // Default icon
  };

  const getPerformance = (category: string): number => {
    // This is a placeholder. You should implement actual performance calculation logic
    const performances: { [key: string]: number } = {
      "DeFi tokens": -17.75,
      "Top-tier coins": -8.4,
      "Scaling coins": -21.94
    };
    return performances[category] || 0;
  };

  const generateConicGradient = () => {
    let gradient = '';
    let currentPercentage = 0;
    assets.forEach((asset, index) => {
      gradient += `${asset.color} ${currentPercentage}% ${currentPercentage + asset.percent}%`;
      currentPercentage += asset.percent;
      if (index < assets.length - 1) gradient += ', ';
    });
    return `conic-gradient(${gradient})`;
  };

  return (
    <div className="crypto-bundle-card">
      <div className="crypto-bundle-header">
        <div className="title-section">
          <div className="icon-title">
            {getIcon(category)} {category} bundle
          </div>
          <div className="performance">
            <span className="performance-value">{getPerformance(category)}%</span>
            <span className="performance-label">Last quarter</span>
          </div>
        </div>
        <p className="description">
          {category === "DeFi tokens" && "Invest in the future of finance ..."}
          {category === "Top-tier coins" && "Own a piece of the most establis..."}
          {category === "Scaling coins" && "Take advantage of the most promi..."}
          <a href="#">Read more</a>
        </p>
      </div>
      
      <div className="crypto-bundle-content">
        <div className="progress-circle" style={{ background: generateConicGradient() }}>
          <div className="circle-inner">
            <span>Value</span>
            <strong>${value.toLocaleString()}</strong>
          </div>
        </div>
      </div>

      <div className="crypto-bundle-footer">
        {assets.map((asset, index) => (
          <div key={index} className="asset-icon" style={{ backgroundColor: asset.color }}>
            {getIcon(asset.name)}
            <span className="asset-percentage">{asset.percent}%</span>
          </div>
        ))}
      </div>

      <button className="buy-button">Buy</button>
    </div>
  );
};

export default CryptoBundle;