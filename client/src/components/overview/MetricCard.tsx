import React from "react";
import "./MetricCard.css";

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  time?: string;
  chart?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, time = '24H', chart }) => (
  <div className="metric-card">
    <div className="header-container">
      <h3 className="title">{title}</h3>
      <p className="time">{time}</p>
    </div>
    <div className="value-container">
      <p className="value">{value}</p>
      <p className={`change ${parseFloat(change) < 0 ? 'negative' : 'positive'}`}>
        {change}
      </p>
    </div>
    {chart && <img src={chart} alt="Chart" className="chart" />}
  </div>
);

export default MetricCard;

{/* <div className="metric-card-header">
      <h3>{title}</h3>
      <p className="time">{time}</p>
    </div> */}