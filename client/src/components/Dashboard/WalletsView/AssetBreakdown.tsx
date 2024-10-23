import React from "react";
import "./AssetBreakdown.css";
import { components } from "../../../types/api-types";
import { lazy, Suspense } from "react";

type Token = components["schemas"]["Token"];

interface TokenBreakdownProps {
  name: string;
  color: string,
  tokens: Token[];
}

// Lazy load the TokenIcon component
const TokenIcon = lazy(() => import("@web3icons/react").then(module => ({
  default: module.TokenIcon
})));

// Create a memoized wrapper for TokenIcon
const MemoizedTokenIcon = React.memo(({ symbol, variant }: { symbol: string; variant: "mono" | "branded" | undefined }) => (
  <Suspense fallback={<div className="icon-placeholder" />}>
    <TokenIcon symbol={symbol} variant={variant} />
  </Suspense>
));

const TokenBreakdown: React.FC<TokenBreakdownProps> = ({ name, tokens, color }) => {

  const totalValue = tokens.reduce((total, tokens) => total + tokens.value, 0);

  const sortedTokens: Token[] = [...tokens].sort((a, b) => b.value - a.value);

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 1,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="dashboard-wallet-container">
      <div className="dashboard-total-value">
        <div className="dashboard-total-label" style={{color: color}}>{name}</div>
        <div className="dashboard-total-amount">
          {formatCurrency(totalValue)}
        </div>
      </div>
      
      {sortedTokens.map((token, index) => (
        <div key={index} className="dashboard-token-row">
          <div className="dashboard-token-info">
            <div className="dashboard-token-icon">
              <MemoizedTokenIcon 
                symbol={token.symbol} 
                variant={"mono"} 
              />
            </div>
            <div className="dashboard-token-name-container">
              <span className="dashboard-token-symbol">{token.symbol}</span>
              <span className="dashboard-token-name">{token.name}</span>
            </div>
          </div>
          
          <div className="dashboard-token-values">
            <span className="dashboard-token-amount">{token.amount.toFixed(4)}</span>
            <span className="dashboard-token-value">
              {formatCurrency(token.value)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TokenBreakdown;
