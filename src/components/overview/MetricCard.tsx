import React from "react";
import './MetricCard.css'

interface MetricCardProps {
    title: string;
    value: string;
    change?: string;
    chart?: React.ReactNode;
  }
  
const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, chart }) => (
<div className="metric-card">
    <h3>{title}</h3>
    <p className="value">{value}</p>
    {change && <p className="change">{change}</p>}
    {chart && <div className="chart">{chart}</div>}
</div>
);

export default MetricCard