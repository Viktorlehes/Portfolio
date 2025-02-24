// TokenTableRow.tsx
import React from 'react';
import { components } from '../../types/api-types';
import { formatCurrencySuffix } from '../../utils/calc';

type UnifiedToken = components['schemas']['UnifiedToken']

interface TokenTableRowProps {
    data: UnifiedToken;
    rank: number;
}

export const TokenTableRow: React.FC<TokenTableRowProps> = ({ data, rank }) => {

    const formatPercentage = (value: number) => {
        return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
    };

    const formatNetFlow = (value: number) => {
        if (Math.abs(value) >= 1e6) {
            return `${value >= 0 ? '+' : '-'}$${Math.abs(value / 1e6).toFixed(2)}M`;
        }
        if (Math.abs(value) >= 1e3) {
            return `${value >= 0 ? '+' : '-'}$${Math.abs(value / 1e3).toFixed(2)}K`;
        }
        return `${value >= 0 ? '+' : '-'}$${Math.abs(value).toFixed(2)}`;
    };

    const getNetFlowClass = (value: number) => {
        return value >= 0 ? 'positive-flow' : 'negative-flow';
    };

    const getPercentageClass = (value: number) => {
        const absValue = Math.abs(value);
        const baseClass = value >= 0 ? 'change-cell-positive' : 'change-cell-negative';

        if (absValue <= 3) {
            return `${baseClass} intensity-1`;
        } else if (absValue <= 5) {
            return `${baseClass} intensity-2`;
        } else if (absValue <= 10) {
            return `${baseClass} intensity-3`;
        } else if (absValue <= 20) {
            return `${baseClass} intensity-4`;
        } else if (absValue <= 50) {
            return `${baseClass} intensity-5`;
        } else {
            return `${baseClass} intensity-5`; // Max intensity for >50%
        }
    };

    return (
        <tr className="token-row">
            <td >{rank}</td>
            <td className={data.logo_url && 'token-symbol-row' || "token-only" }>
            {data.logo_url &&    
            <img className='token-symbol' src={data.logo_url} alt="token icon"/>}
            {data.name}
            </td>
            <td className="price-cell">${data.price_data.price.toFixed(2)}</td>
            <td className={`change-cell ${getPercentageClass(data.price_data.percent_change_24h)}`}>
                {formatPercentage(data.price_data.percent_change_24h)}
            </td>
            <td className={`change-cell ${getPercentageClass(data.price_data.percent_change_7d)}`}>
                {formatPercentage(data.price_data.percent_change_7d)}
            </td>
            <td className="volume-cell">{formatCurrencySuffix(data.price_data.volume_24h)}</td>
            <td className={`change-cell ${getPercentageClass(data.price_data.volume_change_24h)}`}>
                {formatPercentage(data.price_data.volume_change_24h)}
            </td>
            <td className="market-cap-cell">{formatCurrencySuffix(data.price_data.market_cap)}</td>
            <td className={`flow-cell ${getNetFlowClass(data.net_flow_data ? data.net_flow_data.net_flow_24h : 0)}`}>
                {formatNetFlow(data.net_flow_data ? data.net_flow_data.net_flow_24h : 0)}
            </td>
        </tr>
    );
};