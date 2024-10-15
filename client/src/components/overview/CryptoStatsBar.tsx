import React from 'react';
import './CryptoStatsBar.css'
import { CryptoStats } from '../../pages/Overview/Overview';

export interface CryptoStatsProps {
    cryptoStats: CryptoStats;
  }

const CryptoStatsBar: React.FC<CryptoStatsProps> = ({cryptoStats}) => {
  return (
    <div className="crypto-stats">
      <span className="crypto-stat">Cryptos: <span className="crypto-value">{cryptoStats.cryptos}</span></span>
      <span className="crypto-stat">Exchanges: <span className="crypto-value">{cryptoStats.exchanges}</span></span>
      <span className="crypto-stat">
        Market Cap: <span className="crypto-value">{cryptoStats.market_cap.value}</span>
        <span className={`change ${parseFloat(cryptoStats.market_cap.change) >= 0 ? 'positive' : 'negative'}`}>
          {parseFloat(cryptoStats.market_cap.change) >= 0 ? '+' : ''}{parseFloat(cryptoStats.market_cap.change).toFixed(2)}%
        </span>
      </span>
      <span className="crypto-stat">
        24h Vol: <span className="crypto-value">{cryptoStats['24h_vol'].value}</span>
        <span className={`change ${parseFloat(cryptoStats['24h_vol'].change) >= 0 ? 'positive' : 'negative'}`}>
          {parseFloat(cryptoStats['24h_vol'].change) >= 0 ? '+' : ''}{parseFloat(cryptoStats['24h_vol'].change).toFixed(2)}%
        </span>
      </span>
      <span className="crypto-stat">Dominance: <span className="crypto-value">BTC: {parseFloat(cryptoStats.dominance_btc).toFixed(1)}% ETH: {parseFloat(cryptoStats.dominance_eth).toFixed(1)}%</span></span>
      <span className="crypto-stat">ETH Gas: <span className="crypto-value">{parseFloat(cryptoStats.eth_gas).toFixed(2)} Gwei</span></span>
      <span className="crypto-stat">Fear & Greed: <span className="crypto-value">{cryptoStats.fear_greed}/100</span></span>
    </div>
  );
};

export default CryptoStatsBar;