import React from 'react';
import { components } from "../../../types/api-types";
import './TokenBreakdown.css';
import { formatCurrency } from "../../../utils/calc";

type FullToken = components["schemas"]['FullToken'];

interface AssetBreakdownProps {
  name: string;
  color: string;
  address: string;
  tokens: FullToken[];
  totalDefiValue: number;
  totalValue: number;
  //change24h: number;
  onViewDefi?: () => void;
  onViewWallet: (address: string) => void;
  onViewAsset: (assetId: string, assetName: string, isFungible: boolean) => void;
}

const AssetBreakdown: React.FC<AssetBreakdownProps> = ({
  name,
  color,
  address,
  tokens,
  totalDefiValue,
  totalValue,
  //change24h,
  onViewWallet,
  onViewAsset
}) => {

  const sortedTokens = [...tokens].sort((a, b) => {
    const aValue = a.token_data ? a.token_data.value : a.zerion_data.value;
    const bValue = b.token_data ? b.token_data.value : b.zerion_data.value;
    return bValue - aValue;
  });

  const shortenAddress = (address: string, startLength: number = 8): string => {
    return `${address.slice(0, startLength)}...`;
  };

  const top3Tokens = sortedTokens.slice(0, 3);
  const otherTokens = sortedTokens.slice(3);
  const otherTokensValue = otherTokens.reduce((acc, token) => {
    return acc + (token.token_data ? token.token_data.value : token.zerion_data.value);
  }, 0);

  const handleAssetClick = (e: React.MouseEvent, token: FullToken) => {
    e.stopPropagation(); // Prevent triggering the container click

    if (token.token_data) {
      onViewAsset(token.token_data.id, token.token_data.name, false);
      return;
    } else if (token.zerion_data) {
      onViewAsset(token.zerion_data.fungible_id, token.zerion_data.name, true);
      return;
    }
  };

  return (
    <div
      className="dashboard-wallet-container hover-container"
      style={{ background: `linear-gradient(to bottom, ${color}60 1%, white 5px)` }}
      onClick={() => onViewWallet(address)}
      role="button"
      tabIndex={0}
    >
      <div className="dashboard-header">
        <div className='dashboard-header-main'>
          <h3 className="dashboard-title">{name}</h3>
          <div className='total-label'>{shortenAddress(address)}</div>
        </div>
        <div className="dashboard-totals">
          <div className="dashboard-total-section">
            <div className="total-label">Assets</div>
            <div className="dashboard-total-value">{formatCurrency(totalValue, 0, 0)}</div>
          </div>
          {totalDefiValue > 0 && (
            <div className="dashboard-total-section">
              <div className="total-label">DeFi</div>
              <div className="dashboard-total-value">{formatCurrency(totalDefiValue, 0 , 0)}</div>
            </div>
          )}
        </div>
      </div>

      <div className="dashboard-assets">
        {top3Tokens.map((token, index) => (
          <div
            key={index}
            className="asset-row hover-row"
            onClick={(e) => handleAssetClick(e, token)}
            role="button"
            tabIndex={0}
          >
            <div className="asset-info">
              <div className="dashboard-token-icon">
                {token.zerion_data.icon && (
                  <img
                    src={token.zerion_data.icon}
                    alt="token icon"
                  />
                )}
              </div>
              <div className="token-details">
                <div className="token-symbol">
                  {token.token_data ? token.token_data.symbol : token.zerion_data.symbol}
                </div>
                <div className="token-amount">
                  {(token.token_data ? token.token_data.amount : token.zerion_data.quantity.float).toFixed(4)}
                </div>
              </div>
            </div>
            <div className="asset-value">
              {formatCurrency(token.token_data ? token.token_data.value : token.zerion_data.value, 0, 0)}
            </div>
          </div>
        ))}

        {otherTokensValue > 0 && (
          <div className="asset-row">
            <div className="asset-info">
              <div className="other-assets-icon">
                {otherTokens.length}
              </div>
              <div className="token-details">
                <div className="token-symbol">Other</div>
              </div>
            </div>
            <div className="asset-value">
              {formatCurrency(otherTokensValue, 0, 0)}
            </div>
          </div>
        )}
      </div>

      <style>
      </style>
    </div>
  );
};

export default AssetBreakdown;