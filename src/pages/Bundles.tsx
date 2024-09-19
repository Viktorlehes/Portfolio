import React from 'react';
import CryptoBundle from '../components/CryptoBundle';
import './Bundles.css';

export interface Asset {
  name: string;
  percent: number;
  color: string;
}

export interface CryptoCategory {
  category: string;
  assets: Asset[];
  value: number;
  performance: number;
}

const cryptoBundles: CryptoCategory[] = [
  {
    category: "DeFi Tokens",
    assets: [
      { name: "Chainlink", percent: 35, color: '#6366f1' },
      { name: "Aave", percent: 25, color: '#f43f5e' },
      { name: "Uniswap", percent: 25, color: '#0ea5e9' },
      { name: "Synthetix", percent: 15, color: '#14b8a6' },
    ],
    value: 10000,
    performance: -17.75
  },
  {
    category: "Top-Tier Coins",
    assets: [
      { name: "Bitcoin", percent: 30, color: '#f97316' },
      { name: "Ethereum", percent: 25, color: '#6366f1' },
      { name: "Solana", percent: 45, color: '#8b5cf6' },
    ],
    value: 20000,
    performance: -8.4
  },
  {
    category: "Scaling Coins",
    assets: [
      { name: "Polygon", percent: 40, color: '#6366f1' },
      { name: "Optimism", percent: 35, color: '#f97316' },
      { name: "Arbitrum", percent: 25, color: '#8b5cf6' },
    ],
    value: 30000,
    performance: -21.94
  },
];

const CryptoDemoPage: React.FC = () => {
  return (
    <div className="crypto-demo-page">
      <h1>Crypto Bundles</h1>
      <div className="crypto-bundles-container">
        {cryptoBundles.map((bundle, index) => (
          <CryptoBundle
            key={index}
            category={bundle.category}
            assets={bundle.assets}
            value={bundle.value}
            performance={bundle.performance}
          />
        ))}
      </div>
    </div>
  );
};

export default CryptoDemoPage;