// src/pages/Dashboard.tsx
import React from 'react';
import Linechart from '../components/Dashboard/Linechart';
import ValueCard from '../components/Dashboard/ValueCard';
import AssetBreakdown from '../components/Dashboard/AssetBreakdown';
import { assetsPortfolio1, assetsPortfolio2, assetsPortfolio3, data } from '../data/dashboarddata';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  return (
    <div className="default-page">
      <div className="page-header">
        <h1>Wealth Dashboard</h1>
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