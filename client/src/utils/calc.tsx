import { components } from "../types/api-types";

type Wallet = components["schemas"]["UnifiedWallet"];
type WalletToken = components["schemas"]['WalletToken'];
type DefiPosition = components["schemas"]['DefiPosition'];

export const calculate24hChange = (wallets: Wallet[]) => {
    const allPositions = wallets.reduce((acc, wallet) => {
        const tokens = wallet.tokens || [];
        const defiPositions = wallet.defi_positions || [];
        return [...acc, ...tokens, ...defiPositions];
    }, [] as (WalletToken | DefiPosition)[]);

    const totalValue = wallets.reduce((acc, wallet) => {
        return acc += wallet.total_value_usd
    }, 0)

    const totalChange = allPositions.reduce((acc, item) => {
        if (item.position_type == "wallet") {
            const token = item as WalletToken;
            const value = token.value_usd || 0;
            const percentChange = token.price_24h_change || 0;
            return acc + (value * (percentChange / 100));
        } else {
            const position = item as DefiPosition;
            if (position.price_data.price_change_24h) {
                return acc + position.price_data.price_change_24h;
            } else {
                const value = position.price_data.current_value;
                const percentChange = position.price_data.percent_change_24h;
                return acc + (value * (percentChange / 100))
            }
        }
    }, 0);

    console.log(totalValue, totalChange);
    

    return totalValue > 0 ? (totalChange / totalValue) * 100 : 0;
};

export const calculate24hDefiChange = (wallets: Wallet[]) => {
    const allPositions = wallets.reduce((acc, wallet) => {
        const defiPositions = wallet.defi_positions || [];
        return [...acc, ...defiPositions];
    }, [] as DefiPosition[]);

    const totalValue = allPositions.reduce((acc, item) => acc + item.price_data.current_value, 0);
    const totalChange = allPositions.reduce((acc, item) => {
        const position = item as DefiPosition;
        if (position.price_data.price_change_24h) {
            return acc + position.price_data.price_change_24h;
        } else {
            const value = position.price_data.current_value;
            const percentChange = position.price_data.percent_change_24h;
            return acc + (value * (percentChange / 100))
        }
    }, 0);

    return totalValue > 0 ? (totalChange / totalValue) * 100 : 0;
}

export const calculate24hTokenChange = (wallets: Wallet[]) => {
    const allPositions = wallets.reduce((acc, wallet) => {
        const tokens = wallet.tokens || [];
        return [...acc, ...tokens];
    }, [] as WalletToken[]);

    const totalValue = allPositions.reduce((acc, item) => {
        const value = item.value_usd;
        return acc + value;
    }, 0);

    const totalChange = allPositions.reduce((acc, item) => {
        const value = item.value_usd ;
        const percentChange = item.price_24h_change;
        return acc + (value * (percentChange / 100));
    }, 0);

    return totalValue > 0 ? (totalChange / totalValue) * 100 : 0;
}

export const formatCurrencySuffix = (value: number): string => {
    const formats = [
        { threshold: 1e12, suffix: 'T', divisor: 1e12 },
        { threshold: 1e9, suffix: 'B', divisor: 1e9 },
        { threshold: 1e6, suffix: 'M', divisor: 1e6 },
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