import React from 'react';
import './CryptoStatsBar.css'
import { components } from '../../types/api-types';
import { formatCurrencySuffix } from '../../utils/calc';

type MarketData = components['schemas']['MarketDataResponse'];
type FearGreedResponse = components['schemas']['FearGreedResponse'];

interface CryptoStatsProps {
  cryptoStats: MarketData | null;
  feargreeddata: FearGreedResponse | null;
  isLoading: {
    market: boolean;
    fearGreed: boolean;
  };
}

const CryptoStatsBar: React.FC<CryptoStatsProps> = ({
  cryptoStats,
  feargreeddata,
  isLoading
}) => {
  const shouldShowDash = isLoading.market || !cryptoStats;

  const marketCapValue = shouldShowDash ? "-" : 
    formatCurrencySuffix(cryptoStats?.data?.quote?.USD?.total_market_cap || 0);

  const marketCapPercentChange = cryptoStats?.data?.quote?.USD?.total_market_cap_yesterday_percentage_change || 0;
  const marketCapChange = shouldShowDash ? "-" :
    `${marketCapPercentChange >= 0 ? '+' : ''}${marketCapPercentChange.toFixed(2)}%`;

  const volumeValue = shouldShowDash ? "-" :
    formatCurrencySuffix(cryptoStats?.data?.quote?.USD?.total_volume_24h || 0);

  const dominanceValue = shouldShowDash ? "-" :
    `BTC: ${cryptoStats?.data?.btc_dominance.toFixed(1)}% ETH: ${cryptoStats?.data?.eth_dominance.toFixed(1)}%`;

  const fearGreedValue = (isLoading.fearGreed || !feargreeddata) ? "-" :
    `${feargreeddata?.data?.value} ${feargreeddata?.data?.value_classification}`;

  const getChangeClass = (value: number | undefined | null) => {
    if (shouldShowDash || value === undefined || value === null) return '';
    return value >= 0 ? 'positive' : 'negative';
  };

  return (
    <div className="crypto-stats">
      <span className="crypto-stat">
        Market Cap: <span className="crypto-value">{marketCapValue}</span>
        {!shouldShowDash && (
          <span className={`change ${getChangeClass(marketCapPercentChange)}`}>
            {marketCapChange}
          </span>
        )}
      </span>
      <span className="crypto-stat">
        24h Vol: <span className="crypto-value">{volumeValue}</span>
        {!shouldShowDash && (
          <span className={`change ${getChangeClass(marketCapPercentChange)}`}>
            {marketCapChange}
          </span>
        )}
      </span>
      <span className="crypto-stat">
        Dominance: <span className="crypto-value">{dominanceValue}</span>
      </span>
      <span className="crypto-stat">
        Fear & Greed Index: <span className="crypto-value">{fearGreedValue}</span>
      </span>
    </div>
  );
};

export default CryptoStatsBar;