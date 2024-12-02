import { components } from "../types/api-types";

type Wallet = components["schemas"]["Wallet"];
type FullToken = components["schemas"]["FullToken"];
type DefiPosition = components["schemas"]["DefiPosition"];

export const calculate24hChange = (wallets: Wallet[]) => {
    const allPositions = wallets.reduce((acc, wallet) => {
        const tokens = wallet.tokens || [];
        const defiPositions = wallet.defi_positions || [];
        return [...acc, ...tokens, ...defiPositions];
    }, [] as (FullToken | DefiPosition)[]);

    const totalValue = allPositions.reduce((acc, item) => {
        const value = item.hasOwnProperty('token_data')
            ? (item as FullToken).token_data?.value || 0
            : (item as DefiPosition).value;
        return acc + value;
    }, 0);

    const totalChange = allPositions.reduce((acc, item) => {
        if (item.hasOwnProperty('token_data')) {
            const token = item as FullToken;
            const value = token.token_data?.value || 0;
            const percentChange = token.token_data?.change24h || 0;
            return acc + (value * (percentChange / 100));
        } else {
            const position = item as DefiPosition;
            return acc + position.changes.absolute_1d;
        }
    }, 0);

    return totalValue > 0 ? (totalChange / totalValue) * 100 : 0;
};

export const calculate24hDefiChange = (wallets: Wallet[]) => {
    const allPositions = wallets.reduce((acc, wallet) => {
        const defiPositions = wallet.defi_positions || [];
        return [...acc, ...defiPositions];
    }, [] as DefiPosition[]);

    const totalValue = allPositions.reduce((acc, item) => acc + item.value, 0);

    const totalChange = allPositions.reduce((acc, item) => acc + item.changes.absolute_1d, 0);

    return totalValue > 0 ? (totalChange / totalValue) * 100 : 0;
}

export const calculate24hTokenChange = (wallets: Wallet[]) => {
    const allPositions = wallets.reduce((acc, wallet) => {
        const tokens = wallet.tokens || [];
        return [...acc, ...tokens];
    }, [] as FullToken[]);

    const totalValue = allPositions.reduce((acc, item) => {
        const value = item.token_data?.value || 0;
        return acc + value;
    }, 0);

    const totalChange = allPositions.reduce((acc, item) => {
        const value = item.token_data?.value || 0;
        const percentChange = item.token_data?.change24h || 0;
        return acc + (value * (percentChange / 100));
    }, 0);

    return totalValue > 0 ? (totalChange / totalValue) * 100 : 0;
}

export const formatCurrencySuffix = (value: number): string => {
    const formats = [
        { threshold: 1e12, suffix: 'T', divisor: 1e12 },
        { threshold: 1e9, suffix: 'B', divisor: 1e9 },
        { threshold: 1e6, suffix: 'M', divisor: 1e6 },
        { threshold: 1e3, suffix: 'K', divisor: 1e3 },
    ];

    const format = formats.find(({ threshold }) => value >= threshold);
    return format
        ? `$${(value / format.divisor).toFixed(1)}${format.suffix}`
        : `$${value.toFixed(2)}`;
};

export const formatCurrency = (value: number, min: number = 2, max: number = 4): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: min,
      maximumFractionDigits: max,
    }).format(value);
  };

export const formatNumber = (value: number, min: number = 2, max: number = 4): string => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: min,
      maximumFractionDigits: max,
    }).format(value);
  };

export const formatPercent = (value: number): string => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

export const riskParser = (risk: string): string => {
    const colorOptions = [
        { label: 'Safe', color: '#22c55e' },
        { label: 'Normal', color: '#f97316' },
        { label: 'Risky', color: '#ef4444' }
    ];
    const riskLevel = colorOptions.find(option => option.color === risk);
    return riskLevel ? riskLevel.label : 'Unknown';
};