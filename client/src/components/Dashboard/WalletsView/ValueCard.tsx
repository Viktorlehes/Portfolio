import React from 'react';

interface ValueCardProps {
  label: string;
  value: number | string;
  color: string;
  isPercent?: boolean;
  isText?: boolean;
}

const ValueCard: React.FC<ValueCardProps> = ({ label, value, color, isPercent = false, isText = false }) => {
  let formattedValue = value;
  if ( typeof(value) === typeof(0)) {
      formattedValue = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value as number);
  }

  return (
    <div className="value-card">
      <div className="value-card-title" style={{ color }}>{label}</div>
      <div className="value-card-value" style={{ color: isPercent ? (typeof value === 'number' && value >= 0 ? "green" : "red") : 'black' }}>
      {isPercent ? (typeof value === 'number' ? `${value.toFixed(2)}%` : value) : isText ? value : formattedValue}
      </div>
    </div>
  );
};

export default ValueCard;