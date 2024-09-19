import React from 'react';
import CryptoBundle from '../components/CryptoBundle';
import './Bundles.css';

export interface Asset {
  name: string;
  percent: number; // Target weight in percentage
  color: string;
}

export interface CryptoCategory {
  category: string;
  assets: Asset[];
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
  },
  {
    category: "Top-Tier Coins",
    assets: [
      { name: "Bitcoin", percent: 30, color: '#f97316' },
      { name: "Ethereum", percent: 25, color: '#6366f1' },
      { name: "Solana", percent: 45, color: '#8b5cf6' },
    ],
  },
  {
    category: "Scaling Coins",
    assets: [
      { name: "Polygon", percent: 40, color: '#6366f1' },
      { name: "Optimism", percent: 35, color: '#f97316' },
      { name: "Arbitrum", percent: 25, color: '#8b5cf6' },
    ],
  },
];

interface cryptoBundlesValues {
  category: string;
  value: number;
} 

const cryptoBundlesValues: cryptoBundlesValues[] = [
  { category: "DeFi Tokens", value: 10000 },
  { category: "Top-Tier Coins", value: 20000 },
  { category: "Scaling Coins", value: 30000 }
];


const CryptoDemoPage: React.FC = () => {
  return (
    <div className="crypto-demo-page">
      <h1>Crypto Bundles</h1>
      {cryptoBundles.map((bundle, index) => {
        const bundleValue = cryptoBundlesValues.find(v => v.category === bundle.category)?.value || 0;
        return (
          <CryptoBundle
            key={index}
            category={bundle.category}
            assets={bundle.assets}
            value={bundleValue}
          />
        );
      })}
    </div>
  );
};

export default CryptoDemoPage;
