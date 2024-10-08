import React from "react";
import './Gauge.css'

interface GaugeProps {
    value: number;
    max: number;
    label: string;
  }
  
const Gauge: React.FC<GaugeProps> = ({ value, max, label }) => (
<div className="gauge">
    <div className="gauge-bar" style={{ width: `${(value / max) * 100}%` }}></div>
    <span className="gauge-value">{value}/{max}</span>
    <p>{label}</p>
</div>
);

export default Gauge