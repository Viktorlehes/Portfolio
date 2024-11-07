import React from 'react';
import './CryptoStatsBar.css'
import { components } from '../../types/api-types';

type MarketData = components['schemas']['MarketDataResponse'];

export interface CryptoStatsProps {
    cryptoStats: MarketData;
  }

  function formatCurrency (value: number) {
    if (value >= 1e12) {
      return `$${(value / 1e12).toFixed(1)}T`; // Trillions
    } else if (value >= 1e9) {
      return `$${(value / 1e9).toFixed(1)}B`; // Billions
    } else if (value >= 1e6) {
      return `$${(value / 1e6).toFixed(1)}M`; // Millions
    } else if (value >= 1e3) {
      return `$${(value / 1e3).toFixed(1)}K`; // Thousands
    } else {
      return `$${value.toFixed(2)}`; // Smaller values
    }
  }

const CryptoStatsBar: React.FC<CryptoStatsProps> = ({cryptoStats}) => {
  return (
    <div className="crypto-stats">
      <span className="crypto-stat">Cryptos: <span className="crypto-value">{formatCurrency(cryptoStats.data.active_cryptocurrencies)}</span></span>
      <span className="crypto-stat">Exchanges: <span className="crypto-value">{cryptoStats.data.active_exchanges}</span></span>
      <span className="crypto-stat">
        Market Cap: <span className="crypto-value">{formatCurrency(cryptoStats.data.quote.USD.total_market_cap)}</span>
        <span className={`change ${cryptoStats.data.quote.USD.total_market_cap_yesterday_percentage_change >= 0 ? 'positive' : 'negative'}`}>
        {cryptoStats.data.quote.USD.total_market_cap_yesterday_percentage_change >= 0 ? '+' : ''}{cryptoStats.data.quote.USD.total_market_cap_yesterday_percentage_change.toFixed(2)}%
        </span>
      </span>
      <span className="crypto-stat">
        24h Vol: <span className="crypto-value">{formatCurrency(cryptoStats.data.quote.USD.total_volume_24h)}</span>
        <span className={`change ${cryptoStats.data.quote.USD.total_market_cap_yesterday_percentage_change >= 0 ? 'positive' : 'negative'}`}>
          {cryptoStats.data.quote.USD.total_market_cap_yesterday_percentage_change >= 0 ? '+' : ''}{cryptoStats.data.quote.USD.total_market_cap_yesterday_percentage_change.toFixed(2)}%
        </span>
      </span>
      <span className="crypto-stat">Dominance: <span className="crypto-value">BTC: {cryptoStats.data.btc_dominance.toFixed(1)}% ETH: {cryptoStats.data.eth_dominance.toFixed(1)}%</span></span>
    </div>
  );
};


export default CryptoStatsBar;