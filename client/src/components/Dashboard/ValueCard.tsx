// src/components/ValueCard.tsx
import React from 'react';
import './ValueCard.css';

interface ValueCardProps {
  label: string;
  value: number;
  color: string;
}

const ValueCard: React.FC<ValueCardProps> = ({ label, value, color }) => {
  // Format the number with commas for thousands
  const formattedValue = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(value);

  return (
    <div className="value-card" style={{ '--card-color': color } as React.CSSProperties}>
      <div className="value-card-title" style={{ color: color }}>{label}</div>
      <div className="value-card-value">{formattedValue}</div>
    </div>
  );
};

export default ValueCard;