// src/pages/Dashboard.tsx
import React from 'react';
import Linechart from '../components/Linechart'; 
import ValueCard from '../components/ValueCard';
import AssetBreakdown from '../components/AssetBreakdown';
import './Dashboard.css';

export interface Asset {
  name: string;
  value: number;
  color: string;
}

const data = [
  { name: 'Jan 1', Coinbase: 8000, Nexo: 12000, Uniswap: 6000 },
  { name: 'Jan 15', Coinbase: 8500, Nexo: 12500, Uniswap: 6200 },
  { name: 'Jan 30', Coinbase: 9000, Nexo: 13000, Uniswap: 6400 },

  { name: 'Feb 1', Coinbase: 9100, Nexo: 23000, Uniswap: 7000 },
  { name: 'Feb 14', Coinbase: 9500, Nexo: 24000, Uniswap: 7300 },
  { name: 'Feb 28', Coinbase: 10000, Nexo: 25000, Uniswap: 7600 },

  { name: 'Mar 1', Coinbase: 14000, Nexo: 13000, Uniswap: 8000 },
  { name: 'Mar 15', Coinbase: 14500, Nexo: 13500, Uniswap: 8200 },
  { name: 'Mar 30', Coinbase: 15000, Nexo: 14000, Uniswap: 8500 },

  { name: 'Apr 1', Coinbase: 15500, Nexo: 25000, Uniswap: 8700 },
  { name: 'Apr 15', Coinbase: 16000, Nexo: 26000, Uniswap: 9000 },
  { name: 'Apr 30', Coinbase: 16500, Nexo: 27000, Uniswap: 9200 },

  { name: 'May 1', Coinbase: 17000, Nexo: 28000, Uniswap: 9500 },
  { name: 'May 15', Coinbase: 17500, Nexo: 29000, Uniswap: 9800 },
  { name: 'May 31', Coinbase: 18000, Nexo: 30000, Uniswap: 10000 },

  { name: 'Jun 1', Coinbase: 18500, Nexo: 31000, Uniswap: 10300 },
  { name: 'Jun 15', Coinbase: 19000, Nexo: 32000, Uniswap: 10500 },
  { name: 'Jun 30', Coinbase: 19500, Nexo: 33000, Uniswap: 10800 },

  { name: 'Jul 1', Coinbase: 20000, Nexo: 34000, Uniswap: 11000 },
  { name: 'Jul 15', Coinbase: 20500, Nexo: 35000, Uniswap: 11200 },
  { name: 'Jul 30', Coinbase: 21000, Nexo: 36000, Uniswap: 11500 },

  { name: 'Aug 1', Coinbase: 21500, Nexo: 37000, Uniswap: 11700 },
  { name: 'Aug 15', Coinbase: 22000, Nexo: 38000, Uniswap: 12000 },
  { name: 'Aug 31', Coinbase: 22500, Nexo: 39000, Uniswap: 12200 },

  { name: 'Sep 1', Coinbase: 23000, Nexo: 40000, Uniswap: 12500 },
  { name: 'Sep 12', Coinbase: 19000, Nexo: 55500, Uniswap: 9000 },
  { name: 'Sep 15', Coinbase: 23500, Nexo: 41000, Uniswap: 12700 },
  { name: 'Sep 30', Coinbase: 24000, Nexo: 42000, Uniswap: 13000 },

  { name: 'Oct 1', Coinbase: 24500, Nexo: 43000, Uniswap: 13200 },
  { name: 'Oct 15', Coinbase: 25000, Nexo: 44000, Uniswap: 13500 },
  { name: 'Oct 31', Coinbase: 25500, Nexo: 45000, Uniswap: 13700 },

  { name: 'Nov 1', Coinbase: 26000, Nexo: 46000, Uniswap: 14000 },
  { name: 'Nov 15', Coinbase: 26500, Nexo: 47000, Uniswap: 14300 },
  { name: 'Nov 30', Coinbase: 27000, Nexo: 48000, Uniswap: 14500 },

  { name: 'Dec 1', Coinbase: 27500, Nexo: 49000, Uniswap: 14800 },
  { name: 'Dec 15', Coinbase: 28000, Nexo: 50000, Uniswap: 15000 },
  { name: 'Dec 31', Coinbase: 28500, Nexo: 51000, Uniswap: 15300 }
];

const assetsPortfolio1: Asset[] = [
  { name: 'Bitcoin', value: 50000, color: '#8b5cf6' }, // Larger than 30% of total
  { name: 'Ethereum', value: 25000, color: '#10b981' },
  { name: 'Cardano', value: 1500, color: '#f59e0b' },
  { name: 'Solana', value: 4000, color: '#6366f1' },
  { name: 'Polkadot', value: 3000, color: '#ec4899' },
  { name: 'Avalanche', value: 1200, color: '#ef4444' },
  { name: 'Chainlink', value: 1100, color: '#3b82f6' }
];


const assetsPortfolio2: Asset[] = [
  { name: 'Litecoin', value: 35000, color: '#f97316' }, // Larger than 30% of total
  { name: 'Binance Coin', value: 20000, color: '#eab308' },
  { name: 'Ripple', value: 1500, color: '#3b82f6' },
  { name: 'Dogecoin', value: 1200, color: '#a3e635' },
  { name: 'Polygon', value: 2500, color: '#8b5cf6' },
  { name: 'Stellar', value: 1100, color: '#6366f1' }
];


const assetsPortfolio3: Asset[] = [
  { name: 'Cosmos', value: 40000, color: '#14b8a6' }, // Larger than 30% of total
  { name: 'Tezos', value: 1500, color: '#ef4444' },
  { name: 'VeChain', value: 1300, color: '#d946ef' },
  { name: 'Aave', value: 5000, color: '#22c55e' },
  { name: 'Fantom', value: 2500, color: '#9333ea' },
  { name: 'Algorand', value: 1200, color: '#06b6d4' }
];


const Dashboard: React.FC = () => {
  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1>Wealth Overview</h1>
      </div>
      <div className="page-content">
        <section className='dashboard-head'>
          <div className="overview-values">
            <ValueCard label="Coinbase" value={85800} color="#8884d8" />
            <ValueCard label="Nexo" value={61300} color="#82ca9d" />
            <ValueCard label="Uniswap" value={51500} color="#ffc658" />
          </div>
        </section>

        <Linechart data={data}/>

        <section className='dashboard-sub-cat'>
          <AssetBreakdown name={"Coinbase"} assets={assetsPortfolio1} />
          <AssetBreakdown name={"Nexo"} assets={assetsPortfolio2} />
          <AssetBreakdown name={"Uniswap"} assets={assetsPortfolio3} />
        </section>
      </div>
    </div>
  );
};
export default Dashboard;