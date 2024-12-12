import React from 'react';
import './CoinglassMetricBar.css';
import { components } from '../../types/api-types';

type CGLSApiResponse = components['schemas']['CoinglassMetrics'];

interface CoinglassMetricsBarProps {
  data: CGLSApiResponse;
  isNull: boolean;
}

interface MetricItem {
  text: string;
  sub_text?: string | null;
  value: string;
  change: string;
}

const MetricItem: React.FC<{ item: MetricItem }> = ({ item }) => {
  const getChangeClass = (value: string) => {
    if (!value) return '';
    return value.startsWith('+') ? 'cgm-positive' : 'cgm-negative';
  };

  return (
    <div className="cgm-metric-item">
      <div className="cgm-title">
        <div>{item.text}</div>
        {item.sub_text && <div>{item.sub_text}</div>}
      </div>
      <div className="cgm-value">{item.value}</div>
      <div className={`cgm-change ${getChangeClass(item.change)}`}>
        {item.change}
      </div>
    </div>
  );
};

const CoinglassMetricsBar: React.FC<CoinglassMetricsBarProps> = ({
  data,
  isNull
}) => {

  return (
    <div className="cgm-container">
      <div className="cgm-content">
      <MetricItem item={!isNull ? data.open_interest : {text: 'Open Interest', value: 'N/A', change: 'N/A'}} />
      <MetricItem item={!isNull ? data.futures_volume : {text: 'Futures Volume', value: 'N/A', change: 'N/A'}} />
      <MetricItem item={!isNull ? data.liquidations_24h : {text: 'Liquidations 24H', value: 'N/A', change: 'N/A'}} />
      <MetricItem item={!isNull ? data.total_options_open_interest : {text: 'Options OI', value: 'N/A', change: 'N/A'}} />
      <MetricItem item={!isNull ? data.btc_dominance : {text: 'Options Volume', value: 'N/A', change: 'N/A'}} />
      </div>
    </div>
  );
};

export default CoinglassMetricsBar;