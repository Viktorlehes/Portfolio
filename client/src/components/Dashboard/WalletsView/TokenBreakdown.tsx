import React from 'react';
import { components } from "../../../types/api-types";
import './TokenBreakdown.css';
import { formatCurrency } from "../../../utils/calc";

type FullToken = components["schemas"]['WalletToken'];

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
  onViewAsset: (assetId: string) => void;
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
    const aValue = a.value_usd
    const bValue = b.value_usd
    return bValue - aValue;
  });

  const shortenAddress = (address: string, startLength: number = 8): string => {
    return `${address.slice(0, startLength)}...`;
  };

  const top3Tokens = sortedTokens.slice(0, 3);
  const otherTokens = sortedTokens.slice(3);
  const otherTokensValue = otherTokens.reduce((acc, token) => {
    return acc + (token.value_usd);
  }, 0);

  const handleAssetClick = (e: React.MouseEvent, token: FullToken) => {
    e.stopPropagation(); // Prevent triggering the container click

    onViewAsset(token.token_id);
    return;
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
                {token.icon && (
                  <img
                    src={token.icon}
                    alt="token icon"
                  />
                )}
              </div>
              <div className="token-details">
                <div className="token-symbol">
                  {token.symbol}
                </div>
                <div className="token-amount">
                  {token.amount.toFixed(2)}
                </div>
              </div>
            </div>
            <div className="asset-value">
              {formatCurrency(token.value_usd, 1, 1)}
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