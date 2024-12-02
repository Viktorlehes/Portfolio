import React from 'react';
import './TotalWorth.css';
import { components } from '../../types/api-types';
import { calculate24hChange, calculate24hDefiChange, calculate24hTokenChange, formatCurrencySuffix } from '../../utils/calc';

type Wallet = components["schemas"]["Wallet"];

interface TotalWorthProps {
  wallets: Wallet[] | null;
  isLoading: boolean;
}

interface WorthMetrics {
  totalWalletValue: number;
  totalAssetValue: number;
  totalDefiValue: number;
  total24hWalletChange: number;
  totalAsset24hChange: number;
  totalDefi24hChange: number;
}

// Default metrics when data is not available
const DEFAULT_METRICS: WorthMetrics = {
  totalWalletValue: 0,
  totalAssetValue: 0,
  totalDefiValue: 0,
  total24hWalletChange: 0,
  totalAsset24hChange: 0,
  totalDefi24hChange: 0,
};

const calculateMetrics = (wallets: Wallet[] | null): WorthMetrics => {
  if (!wallets || wallets.length === 0) {
    return DEFAULT_METRICS;
  }

  const totalAssetValue = wallets.reduce(
    (sum, wallet) => sum + (wallet?.asset_total ?? 0),
    0
  );

  const totalDefiValue = wallets.reduce(
    (sum, wallet) => sum + (wallet?.defi_total ?? 0),
    0
  );

  return {
    totalAssetValue,
    totalDefiValue,
    totalWalletValue: totalAssetValue + totalDefiValue,
    total24hWalletChange: calculate24hChange(wallets),
    totalAsset24hChange: calculate24hTokenChange(wallets),
    totalDefi24hChange: calculate24hDefiChange(wallets),
  };
};

const WorthDisplay: React.FC<{
  label: string;
  value: number;
  change: number;
  isLoading: boolean;
  small?: boolean;
}> = ({ label, value, change, isLoading, small = false }) => {
  const getChangeClass = (value: number) => value >= 0 ? 'tw-positive' : 'tw-negative';
  const ChangeValueComponent = small ? 'tw-change-value-small' : 'tw-change-value';

  return (
    <div className={small ? 'tw-breakdown-item' : ''}>
      <div className={small ? 'tw-breakdown-label' : 'tw-title'}>{label}</div>
      <div className={small ? 'tw-breakdown-value' : 'tw-total-amount'}>
        {isLoading ? "-" : formatCurrencySuffix(value)}
      </div>
      <div className={small ? 'tw-breakdown-changes' : 'tw-changes'}>
        {isLoading ? (
          <span className={ChangeValueComponent}>-</span>
        ) : (
          <span className={`${ChangeValueComponent} ${getChangeClass(change)}`}>
            {change > 0 ? '+' : ''}{change.toFixed(small ? 1 : 2)}%
          </span>
        )}
      </div>
    </div>
  );
};

const TotalWorth: React.FC<TotalWorthProps> = ({ wallets, isLoading }) => {
  const metrics = React.useMemo(() => 
    calculateMetrics(isLoading ? null : wallets),
    [wallets, isLoading]
  );

  return (
    <div className="tw-container">
      <div className="tw-content">
        <div className="tw-main-worth">
          <WorthDisplay
            label="TOTAL WORTH"
            value={metrics.totalWalletValue}
            change={metrics.total24hWalletChange}
            isLoading={isLoading}
          />
        </div>
        <div className="tw-breakdown">
          <WorthDisplay
            label="DeFi"
            value={metrics.totalDefiValue}
            change={metrics.totalDefi24hChange}
            isLoading={isLoading}
            small
          />
          <WorthDisplay
            label="Assets"
            value={metrics.totalAssetValue}
            change={metrics.totalAsset24hChange}
            isLoading={isLoading}
            small
          />
        </div>
      </div>
    </div>
  );
};

export default TotalWorth;