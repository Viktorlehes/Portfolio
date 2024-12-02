import React from "react";
import "./MetricCard.css";
import { Coins } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  absoluteChange?: string;
  time?: string;
  Chart?: React.ReactNode;
  amount?: string;
  icon?: React.ReactNode;
  handleClick?: () => void;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change = '',
  absoluteChange,
  time = '24H',
  Chart,
  amount,
  icon,
  handleClick
}) => {
  if (!value.startsWith('$')) {
    value = `$${value}`;
  }

  const defaultIcon = (
    <div className="default-token-icon">
      <Coins size={20} color="#8b5cf6" />
    </div>
  );

  const changeValue = parseFloat(change);

  return (
    <div className="metric-card redirectable-card"
      onClick={handleClick}
      role="button"
      tabIndex={0}
    >
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
        <div className="change-container">
          <p className={`change ${changeValue < 0 ? 'negative' : 'positive'}`}>
            {change}
          </p>
          {absoluteChange && (
            <p className={`absolute-change ${changeValue < 0 ? 'negative' : 'positive'}`}>
              ({absoluteChange})
            </p>
          )}
        </div>
      </div>
      {Chart ?
        <div className="chart-container-asset">
          {Chart}
        </div>
        : null}
    </div>
  );
};

export default MetricCard;