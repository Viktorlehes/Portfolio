import React from "react";
import "./MetricCard.css";
import { Coins } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  time?: string;
  Chart?: React.ReactNode;
  amount?: string;
  icon?: React.ReactNode;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  change = '', 
  time = '24H', 
  Chart, 
  amount,
  icon
}) => {
  if (value.charAt(0) != '$') {
    value = `$${value}`;
  }

  const defaultIcon = (
    <div className="default-token-icon">
      <Coins size={20} color="#8b5cf6" />
    </div>
  );

  return (
    <div className="metric-card">
      <div className="header-container">
        <div className="icon-container">
          {icon || defaultIcon}
        </div>
        <div className="title-container">
          <h3 className="title">{title}</h3>
          <p className="time">{time}</p>
        </div>
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
      <div style={{height: "100px"}}>
      {Chart ? Chart : <></>}
      </div>
    </div>
  );
}

export default MetricCard;