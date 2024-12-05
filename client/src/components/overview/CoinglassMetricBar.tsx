import React from 'react';
import './CoinglassMetricBar.css';
import { components } from '../../types/api-types';

type CGLSApiResponse = components['schemas']['APIResponse'];

interface CoinglassMetricsBarProps {
  data: CGLSApiResponse | null;
  isNull: boolean;
}

interface MetricItem {
  text: string;
  sub_text?: string | null;
  value: string;
  change: string;
}

// Create a default metric item
const createDefaultMetric = (text: string): MetricItem => ({
  text,
  sub_text: null,
  value: '0',
  change: '0%'
});

// Default metrics map
const DEFAULT_METRICS: Record<string, MetricItem> = {
  'open_interest': createDefaultMetric('Open Interest'),
  'futures_volume': createDefaultMetric('Futures Volume'),
  'liquidations_24h': createDefaultMetric('Liquidations 24H'),
  'total_options_open_interest': createDefaultMetric('Options OI'),
  'btc_long_short_ratio': createDefaultMetric('Long/Short Ratio'),
  'btc_dominance': createDefaultMetric('BTC Dominance')
};

const SafeMetricDisplay = ({ 
  data,
  metricKey,
  isNull,
}: {
  data: CGLSApiResponse | null;
  metricKey: keyof typeof DEFAULT_METRICS;
  isNull: boolean;
}) => {
  const metricData = React.useMemo(() => {
    if (isNull) {
      return DEFAULT_METRICS[metricKey];
    }
    return data && data.data ? (data.data as Record<keyof typeof DEFAULT_METRICS, MetricItem>)[metricKey] : DEFAULT_METRICS[metricKey];
  }, [data, metricKey, isNull]);

  return <MetricItem item={metricData} />;
};

const MetricItem: React.FC<{ item: MetricItem }> = ({ item }) => {
  const getChangeClass = (value: string) => {
    if (!value) return '';
    return value.startsWith('+') ? 'cgm-positive' : 'cgm-negative';
  };

  return (
    <div className="cgm-metric-item">
      <div className="cgm-title">
        <div>{item.text}</div>
      </div>
      <div className="cgm-value">{item.value}</div>
      <div className={`cgm-change ${getChangeClass(item.change)}`}>
        {item.change}
      </div>
    </div>
  );
};

// Array of metric keys for mapping
const METRIC_KEYS = [
  'open_interest',
  'futures_volume',
  'liquidations_24h',
  'total_options_open_interest',
  'btc_long_short_ratio',
  'btc_dominance'
] as const;

const CoinglassMetricsBar: React.FC<CoinglassMetricsBarProps> = ({ 
  data, 
  isNull 
}) => {
  return (
    <div className="cgm-container">
      <div className="cgm-content">
        {METRIC_KEYS.map((metricKey) => (
          <SafeMetricDisplay
            key={metricKey}
            data={data}
            metricKey={metricKey}
            isNull={isNull}
          />
        ))}
      </div>
    </div>
  );
};

export default CoinglassMetricsBar;