import React from 'react';
import './AssetList.css';
import { formatCurrency, formatNumber } from '../../../utils/calc';
import { useNavigate } from 'react-router-dom';
import { Asset } from './AssetsView';

interface AssetListProps {
  assets: Asset[];
  handleClick: (assetId: string, assetName: string, isFungible: boolean, navigate: ReturnType<typeof useNavigate> ) => void;
  navigate: ReturnType<typeof useNavigate>;
}

const AssetList: React.FC<AssetListProps> = ({ assets, handleClick, navigate }) => {
  return (
    <>
      <div className="assets-table">
        <div className="table-header-asset-list">
          <div className="col-asset">ASSET</div>
          <div className="col-price">PRICE</div>
          <div className="col-change">24H CHANGE</div>
          <div className="col-balance">BALANCE</div>
          <div className="col-value">VALUE</div>
        </div>
        {assets.map((asset, index) =>     
        (
          <div key={index} className="table-row-asset-list redirectable-card"
          onClick={() => handleClick(asset.fungible_id, asset.name, true, navigate)}
          role="button"
          tabIndex={0}
          >
            <div className="col-asset">
              <div className="asset-info">
                <div className="token-icon">
                  {asset.icon && (
                    <img src={asset.icon} alt={asset.symbol} />
                  )}
                </div>
                <div className="token-details">
                  <div className="token-name">{asset.symbol}</div>
                </div>
              </div>
            </div>
            <div className="col-price">
              {asset.price && formatCurrency(asset.price, 2, 2)}
            </div>
            <div className="col-change">
              <div className={`change-value ${asset.change >= 0 ? 'positive' : 'negative'}`}>
                {asset.change > 0 ? '+' : ''}{asset.change.toFixed(2)}%
              </div>
            </div>
            <div className="col-balance">
              {formatNumber(asset.amount)}
            </div>
            <div className="col-value">
              <div className="value-info">
                {formatCurrency(asset.value, 2, 2)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default AssetList;