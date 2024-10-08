import React from 'react';
import './CryptoFearGreadIndex.css';
import { Triangle } from 'lucide-react';

interface CryptoFearGreedIndexProps {
  currentIndex: number;
  yesterdayIndex: number;
  lastweekIndex: number;
}

const CryptoFearGreedIndex: React.FC<CryptoFearGreedIndexProps> = ({currentIndex, yesterdayIndex, lastweekIndex}) => {
  const getIndexLabel = (index: number) => {
    if (index <= 25) return 'Extreme Fear';
    if (index <= 45) return 'Fear';
    if (index <= 55) return 'Neutral';
    if (index <= 75) return 'Greed';
    return 'Extreme Greed';
  };

  return (
    <div className="index-container">
      <div className='index-header'>
        <h1 className="index-title">Crypto Fear &amp; Greed Index</h1>
      </div>
      <div className="index-content">
        <div className="index-background">
          <div className='index-info-container'>
            <Triangle size={30} />
            <div>{currentIndex}</div>
            <div>{getIndexLabel(currentIndex)}</div>
          </div>
        </div>
        <div className="index-info">
          <div className="index-info-item">
            <div className='index-info-lable-container'>
              <div className="index-info-label">Yesterday</div>
              <div className='index-info-indexlable'>{getIndexLabel(yesterdayIndex)}</div>
            </div>
            <div className="index-info-value">{yesterdayIndex}</div>
          </div>
          <div className="index-info-item">
            <div className='index-info-lable-container'>
              <div className="index-info-label">Last Week</div>
              <div className='index-info-indexlable'>{getIndexLabel(yesterdayIndex)}</div>
            </div>
            <div className="index-info-value">{lastweekIndex}</div>
          </div>
        </div>
      </div>
      </div>
  );
};

export default CryptoFearGreedIndex;