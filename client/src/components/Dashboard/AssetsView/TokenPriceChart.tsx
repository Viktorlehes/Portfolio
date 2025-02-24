import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import './TokenPriceChart.css';

export interface ChartData {
  links: {
    self: string;
  };
  data: {
    type: string;
    id: string;
    attributes: {
      begin_at: string;
      end_at: string;
      stats: {
        first: number;
        min: number;
        avg: number;
        max: number;
        last: number;
      };
      points: [number, number][];
    };
  };
}

interface TokenPriceChartProps {
  chartData: ChartData | null;
}

const TokenPriceChart: React.FC<TokenPriceChartProps> = ({ chartData }) => {
  const transformedData = chartData!.data.attributes.points.map(([timestamp, price]) => ({
    timestamp,
    price,
    date: new Date(timestamp * 1000)
  }));

  const { first, last, min, max } = chartData!.data.attributes.stats;
  const isNegativeChange = last < first;
  const lineColor = isNegativeChange ? '#ef4444' : '#22c55e';

  // Calculate y-axis domain with some padding
  const yDomain = [
    min - (max - min) * 0.1, // Add 10% padding to bottom
    max + (max - min) * 0.1  // Add 10% padding to top
  ];

  const formatPrice = (price: number) => {
    return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="tooltip">
          <p className="tooltip-date">
            {new Intl.DateTimeFormat('en-US', {
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            }).format(data.date)}
          </p>
          <p className="tooltip-price">{formatPrice(data.price)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart 
          data={transformedData}
          margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
        >
          <XAxis 
            dataKey="timestamp"
            hide={true}
          />
          <YAxis
            hide={true}
            domain={yDomain}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="price"
            stroke={lineColor}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TokenPriceChart;