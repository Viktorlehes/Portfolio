import React from 'react';
import './AssetList.css';

interface AssetListProps {
  assets: {
    name: string;
    value: number;
    amount: number;
    icon?: string;
    symbol: string;
    price?: number;
    chain?: string;
    change: number;
  }[];
}

const AssetList: React.FC<AssetListProps> = ({ assets }) => {
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(value);
  };

  return (
    <>
      <div className="assets-table">
        <div className="table-header">
          <div className="col-asset">ASSET</div>
          <div className="col-price">PRICE</div>
          <div className="col-change">24H CHANGE</div>
          <div className="col-balance">BALANCE</div>
          <div className="col-value">VALUE</div>
        </div>
        {assets.map((asset, index) => (
          <div key={index} className="table-row">
            <div className="col-asset">
              <div className="asset-info">
                <div className="token-icon">
                  {asset.icon && (
                    <img src={asset.icon} alt={asset.symbol} />
                  )}
                </div>
                <div className="token-details">
                  <div className="token-name">{asset.symbol}</div>
                  {asset.chain && <div className="token-chain">{asset.chain}</div>}
                </div>
              </div>
            </div>
            <div className="col-price">
              {asset.price && formatCurrency(asset.price)}
            </div>
            <div className="col-change">
              <div className={`change-value ${asset.change >= 0 ? 'positive' : 'negative'}`}>
                {asset.change > 0 ? '+' : ''}{asset.change.toFixed(2)}%
              </div>
            </div>
            <div className="col-balance">
              {formatNumber(asset.amount)} {asset.symbol}
            </div>
            <div className="col-value">
              <div className="value-info">
                {formatCurrency(asset.value)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default AssetList;