import React, {useState, useEffect} from 'react';
import './CryptoStatsBar.css'
import { components } from '../../types/api-types';
import { formatCurrencySuffix } from '../../utils/calc';
import { FetchState } from '../../utils/api';

type MarketStats = components['schemas']['MarketStats'];
type FearGreadData = components['schemas']['FearGreadData'];

interface CryptoStatsProps {
  cryptoStats: FetchState<MarketStats>;
  feargreedData: FetchState<FearGreadData>;
}

const CryptoStatsBar: React.FC<CryptoStatsProps> = ({
  cryptoStats,
  feargreedData,
}) => {
  const [showNull , setShowNull] = useState({
    cryptoStats: cryptoStats.isLoading,
    feargreedData: feargreedData.isLoading
  })
  
  useEffect(() => {
    setShowNull({
      cryptoStats: cryptoStats.isLoading || !!cryptoStats.error,
      feargreedData: feargreedData.isLoading || !!feargreedData.error
    });
  }, [cryptoStats, feargreedData]);

  const marketCapValue = showNull.cryptoStats ? 0 : 
    formatCurrencySuffix(cryptoStats.data!.quote.USD.total_market_cap);

  const marketCapPercentChange = showNull.cryptoStats ? 0:
    cryptoStats.data!.quote.USD.total_market_cap_yesterday_percentage_change;
  
  const marketCapChange = showNull.cryptoStats ? 0 :
    `${marketCapPercentChange >= 0 ? '+' : ''}${marketCapPercentChange.toFixed(2)}%`;

  const volumeValue = showNull.cryptoStats ? 0 :
    formatCurrencySuffix(cryptoStats.data!.quote.USD.total_volume_24h);

  const dominanceValue = showNull.cryptoStats ? 0 :
    `BTC: ${cryptoStats.data!.btc_dominance.toFixed(1)}% ETH: ${cryptoStats.data!.eth_dominance.toFixed(1)}%`;

  const fearGreedValue = (showNull.feargreedData) ? 0 :
    `${feargreedData.data!.value} ${feargreedData.data!.value_classification}`;

  const getChangeClass = (value: number) => {
    return value >= 0 ? 'positive' : 'negative';
  };

  return (
    <div className="crypto-stats">
      <span className="crypto-stat">
        Market Cap: <span className="crypto-value">{marketCapValue}</span>
        {!showNull.cryptoStats && (
          <span className={`change ${getChangeClass(marketCapPercentChange)}`}>
            {marketCapChange}
          </span>
        )}
      </span>
      <span className="crypto-stat">
        24h Vol: <span className="crypto-value">{volumeValue}</span>
        {!showNull.cryptoStats && (
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