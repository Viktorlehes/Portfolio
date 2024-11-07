import React from 'react';
import { components } from "../../../types/api-types";
import './TokenBreakdown.css';

type FullToken = components["schemas"]['FullToken'];

interface AssetBreakdownProps {
  name: string;
  color: string;
  address: string;
  tokens: FullToken[];
  totalDefiValue: number;
  totalValue: number;
  change24h: number;
  onViewDefi?: () => void;
  onViewWallet: (address: string) => void;
}

const AssetBreakdown: React.FC<AssetBreakdownProps> = ({
  name,
  color,
  address,
  tokens,
  totalDefiValue,
  totalValue,
  change24h,
  onViewDefi,
  onViewWallet
}) => {
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 1,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const sortedTokens = [...tokens].sort((a, b) => {
    const aValue = a.token_data ? a.token_data.value : a.zerion_data.value;
    const bValue = b.token_data ? b.token_data.value : b.zerion_data.value;
    return bValue - aValue;
  });

  const top3Tokens = sortedTokens.slice(0, 3);
  const otherTokens = sortedTokens.slice(3);
  const otherTokensValue = otherTokens.reduce((acc, token) => {
    return acc + (token.token_data ? token.token_data.value : token.zerion_data.value);
  }, 0);

  return (
    <div className="dashboard-wallet-container" style={{ borderTop: `3px solid ${color}` }}>
      <div className="dashboard-header">
        <div className='dashboard-header-main'>
          <h3 className="dashboard-title">{name}</h3>
            <div className="dashboard-change" style={{ color: change24h < 0 ? 'red' : 'green' }}>
            {change24h > 0 ? '+' : ''}{change24h.toFixed(2)}%
            </div>
        </div>
        <div className="dashboard-totals">
          <div className="dashboard-total-section">
            <div className="total-label">Assets</div>
            <div className="dashboard-total-value">{formatCurrency(totalValue)}</div>
          </div>
          {totalDefiValue > 0 && (
            <div className="dashboard-total-section">
              <div className="total-label">DeFi</div>
              <div className="dashboard-total-value">{formatCurrency(totalDefiValue)}</div>
            </div>
          )}
        </div>
      </div>

      <div className="dashboard-assets">
        {top3Tokens.map((token, index) => (
          <div key={index} className="asset-row">
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
              {formatCurrency(token.token_data ? token.token_data.value : token.zerion_data.value)}
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
              {formatCurrency(otherTokensValue)}
            </div>
          </div>
        )}
      </div>

      <div className='dashboard-view-buttons'>
        <button
          className="view-wallet-button"
          onClick={() => onViewWallet(address)}
        >
          View Wallet
        </button>
        {totalDefiValue > 0 &&
          <button
            className='view-wallet-button'
            onClick={onViewDefi}
          >
            Defi Positions
          </button>}
      </div>
    </div>
  );
};

export default AssetBreakdown;







// import React, { useState, lazy, Suspense } from "react";
// import { components } from "../../../types/api-types";
// import "./AssetBreakdown.css";

// type FullToken = components["schemas"]['FullToken'];
// type DefiPosition = components["schemas"]['DefiPosition'];

// interface TokenBreakdownProps {
//   name: string;
//   color: string;
//   tokens: FullToken[];
//   defi_positions: DefiPosition[];
//   totalDefiValue: number;
//   totalValue: number;
// }

// const TokenIcon = lazy(() => import("@web3icons/react").then(module => ({
//   default: module.TokenIcon
// })));

// const MemoizedTokenIcon = React.memo(({ symbol, variant }: { symbol: string; variant: "mono" | "branded" | undefined }) => (
//   <Suspense fallback={<div className="icon-placeholder" />}>
//     <TokenIcon symbol={symbol} variant={variant} />
//   </Suspense>
// ));

// const TokenBreakdown: React.FC<TokenBreakdownProps> = ({ name, color, tokens, defi_positions, totalDefiValue, totalValue }) => {
//   const [showZeroValues, setShowZeroValues] = useState(false);

//   const sortedTokens: FullToken[] = [...tokens]
//     .filter(token => showZeroValues || (token.token_data ? token.token_data.value : token.zerion_data.value) > 0)
//     .sort((a, b) => {
//       const aValue = a.token_data ? a.token_data.value : a.zerion_data.value;
//       const bValue = b.token_data ? b.token_data.value : b.zerion_data.value;
//       return bValue - aValue;
//     });

// // Filter out zero-value positions and group by protocol
// const groupedDefiPositions = defi_positions
//   .filter(position => (showZeroValues || position.value >= 1))
//   .reduce((acc, position) => {
//     const protocol = position.protocol;
//     if (!acc[protocol]) {
//       acc[protocol] = [];
//     }
//     acc[protocol].push(position);
//     return acc;
//   }, {} as Record<string, DefiPosition[]>);

//   const formatCurrency = (value: number): string => {
//     return new Intl.NumberFormat("en-US", {
//       style: "currency",
//       currency: "USD",
//       minimumFractionDigits: 1,
//       maximumFractionDigits: 2,
//     }).format(value);
//   };

//   // Only show DeFi section if there are non-zero value positions
//   const hasNonZeroDefiPositions = Object.values(groupedDefiPositions).some(positions => positions.length > 0);

//   return (
//     <div className="dashboard-wallet-container" style={{ borderTop: `3px solid ${color}` }}>
//       <div className="dashboard-total-label">
//         <section>{name}</section>
//         <div className="toggle-container">
//           <span className="toggle-label">Show &lt;0</span>
//           <label className="toggle">
//             <input
//               type="checkbox"
//               checked={showZeroValues}
//               onChange={() => setShowZeroValues(!showZeroValues)}
//             />
//             <span className="toggle-slider"></span>
//           </label>
//         </div>
//       </div>

//       <div className="dashboard-total-value">
//         <div>
//           <h2>Assets</h2>
//           <div className="dashboard-total-amount">
//             {formatCurrency(totalValue)}
//           </div>
//         </div>
//         <div className="dashboard-view">
//           View
//         </div>
//       </div>

//       <div className="dashboard-asset-container">
//         {sortedTokens.map((token, index) => (
//           <div key={index} className="dashboard-token-row">
//             <div className="dashboard-token-info">
//               <div className="dashboard-token-icon">
//                 {token.zerion_data.icon ?
//                   <img src={token.zerion_data.icon} alt="icon" /> :
//                   <MemoizedTokenIcon
//                     symbol={token.token_data ? token.token_data.symbol : token.zerion_data.symbol || ""}
//                     variant={"mono"}
//                   />
//                 }
//               </div>
//               <div className="dashboard-token-name-container">
//                 <span className="dashboard-token-symbol">
//                   {token.token_data ? token.token_data.symbol : token.zerion_data.symbol}
//                 </span>
//                 <span className="dashboard-token-name">
//                   {token.token_data ? token.token_data.name : token.zerion_data.name}
//                 </span>
//               </div>
//             </div>
//             <div className="dashboard-token-values">
//               <span className="dashboard-token-amount">
//                 {(token.token_data ? token.token_data.amount : token.zerion_data.quantity.float).toFixed(4)}
//               </span>
//               <span className="dashboard-token-value">
//                 {formatCurrency(token.token_data ? token.token_data.value : token.zerion_data.value)}
//               </span>
//             </div>
//           </div>
//         ))}
//       </div>

//       {hasNonZeroDefiPositions && (
//         <>
//           <div className="dashboard-total-value">
//             <div>
//               <h2>Defi positions</h2>
//               <div className="dashboard-total-amount">
//                 {formatCurrency(totalDefiValue)}
//               </div>
//             </div>
//             <div className="dashboard-view">
//               View
//             </div>
//           </div>

// {Object.entries(groupedDefiPositions).map(([protocol, positions]) => (
//   positions.length > 0 && (
//     <div key={protocol} className="defi-protocol-section">
//       <div className="defi-protocol-header">
//         <div className="defi-protocol-info">
//           <div className="dashboard-token-icon">
//             <img src={positions[0].icon} alt={protocol} />
//           </div>
//           <div className="defi-protocol-name">
//             {protocol.toUpperCase()}
//           </div>
//         </div>
//       </div>

//       {positions.map((position, index) => (
//         <div key={index} className="defi-position-row">
//           <div className="defi-position-info">
//             <div className="dashboard-token-icon">
//               <img src={position.icon} alt={position.symbol} />
//             </div>
//             <div className="position-details">
//               <div className="position-name">{position.name}</div>
//               <div className="position-metadata">
//                 <span className="chain-badge">
//                   {position.chain} · {position.position_type}
//                 </span>
//               </div>
//             </div>
//           </div>
//           <div className="position-values">
//             <div className="position-balance">
//               {position.quantity.float.toFixed(4)} {position.symbol}
//             </div>
//             <div className="position-value-container">
//               <div className={`position-value ${position.position_type === 'loan' ? 'loan-value' : ''}`}>
//                 {formatCurrency(position.value)}
//               </div>
//             </div>
//           </div>
//         </div>
//       ))}
//     </div>
//   )
// ))}
//         </>
//       )}
//     </div>
//   );
// };

// export default TokenBreakdown;