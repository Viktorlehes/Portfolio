import React from 'react';

interface ValueCardProps {
  label: string;
  value: number;
  color: string;
  isPercent?: boolean;
  isText?: boolean;
}

const ValueCard: React.FC<ValueCardProps> = ({ label, value, color, isPercent = false, isText = false }) => {
  const formattedValue = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(value);

  return (
    <div className="value-card">
      <div className="value-card-title" style={{ color }}>{label}</div>
      <div className="value-card-value" style={{ color: isPercent ? (value >= 0 ? "green" : "red" ) : 'black' }}>
      {isPercent ? `${value.toFixed(2)}%` : isText ? value : formattedValue}
      </div>
    </div>
  );
};

export default ValueCard;