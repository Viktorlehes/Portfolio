import React from "react";
import "./MetricCard.css";

interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  time?: string;
  chart?: string;
  amount?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change = '', time = '24H', chart, amount }) => (
  <div className="metric-card">
    <div className="header-container">
      <h3 className="title">{title}</h3>
      <p className="time">{time}</p>
    </div>
    <div className="value-container">
      <div className="value-container-details">
      <p className="value">{value}</p>
      <p className="amount">{amount}</p>
      </div>
      <p className={`change ${parseFloat(change) < 0 ? 'negative' : 'positive'}`}>
        {change}
      </p>
    </div>
    {chart && <img src={chart} alt="Chart" className="chart" />}
  </div>
);

export default MetricCard;