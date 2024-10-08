import React from "react";
import CryptoFearGreedIndex from "../components/CryptoFearGreadIndex";

const Overview: React.FC = () => {
  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1>Market Overview</h1>
      </div>
      <div className="page-content">
        <CryptoFearGreedIndex
          currentIndex={50} 
          yesterdayIndex={61}
          lastweekIndex={54}
        />
      </div>
    </div>
  );
};

export default Overview;