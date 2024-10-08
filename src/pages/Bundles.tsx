import React, { useState } from 'react';
import BundleOverview from '../components/Bundles/BundleOverview';
import CryptoBundle from '../components/Bundles/CryptoBundle';
import WalletSelector from '../components/Bundles/WalletSelector';
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

const generateCryptoBundles = (totalValue: number): CryptoCategory[] => {
  const scaleFactor = totalValue / 60000;
  return [
    {
      category: "DeFi Tokens",
      assets: [
        { name: "Chainlink", percent: 35, color: '#6366f1' },
        { name: "Aave", percent: 25, color: '#f43f5e' },
        { name: "Uniswap", percent: 25, color: '#0ea5e9' },
        { name: "Synthetix", percent: 15, color: '#14b8a6' },
      ],
      value: Math.round(10000 * scaleFactor),
      performance: -17.75
    },
    {
      category: "Top-Tier Coins",
      assets: [
        { name: "Bitcoin", percent: 30, color: '#f97316' },
        { name: "Ethereum", percent: 25, color: '#6366f1' },
        { name: "Solana", percent: 45, color: '#8b5cf6' },
      ],
      value: Math.round(20000 * scaleFactor),
      performance: -8.4
    },
    {
      category: "Scaling Coins",
      assets: [
        { name: "Polygon", percent: 40, color: '#6366f1' },
        { name: "Optimism", percent: 35, color: '#f97316' },
        { name: "Arbitrum", percent: 25, color: '#8b5cf6' },
      ],
      value: Math.round(30000 * scaleFactor),
      performance: -21.94
    },
  ];
};

const CryptoDemoPage: React.FC = () => {
  const [cryptoBundles, setCryptoBundles] = useState<CryptoCategory[]>(generateCryptoBundles(60000));

  const handleWalletChange = (wallet: { name: string; value: number }) => {
    setCryptoBundles(generateCryptoBundles(wallet.value));
  };

  return (
    <div className="crypto-demo-container">
      <div className="crypto-demo-header">
        <h1 className="crypto-demo-title">Crypto Bundles</h1>
        <WalletSelector onWalletChange={handleWalletChange} />
      </div>
      <div className="crypto-demo-content">
        <BundleOverview bundles={cryptoBundles} />
        <div className="crypto-bundles-grid">
          {cryptoBundles.map((bundle, index) => (
            <div key={index} className="crypto-bundle-item">
              <CryptoBundle {...bundle} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CryptoDemoPage;