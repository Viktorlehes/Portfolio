import React, { useState, useEffect } from "react";
import { useLoaderData, useNavigate, LoaderFunction, LoaderFunctionArgs } from "react-router-dom";
import { components } from "../../types/api-types";
import { ArrowLeft } from "lucide-react"; 4
import ValueCard from "../../components/Dashboard/WalletsView/ValueCard";
import DefiPositions from "../../components/Dashboard/WalletView/DefiPositions";
import "./SingleWalletView.css";
import { formatCurrency, formatPercent, formatNumber } from "../../utils/calc";
import { getCachedData, isDataExpired } from "../../utils/api";
import LoadingOverlay from "../../components/Default/LoadingOverlay";
import { ExtendedDefiPosition } from "../Defi/Defi";
import { api } from "../../utils/api";
import { useActiveFetches, isEndpointFetching } from "../../context/ActiveFetchesContext";

type Wallet = components["schemas"]["Wallet"];
type FullToken = components["schemas"]["FullToken"];
type DefiPosition = components["schemas"]["DefiPosition"];

interface CachedData<T> {
    data: T;
    timestamp: number;
}

const CACHE_KEYS = {
    WALLETS: 'wallets'
} as const;

const API_ENDPOINTS = {
    WALLETS: '/wallet/get_wallets',
} as const;

interface LoaderData {
    wallets: CachedData<Wallet[] | null>;
    walletAddress: string;
}

export const walletLoader: LoaderFunction = async ({ params }: LoaderFunctionArgs): Promise<LoaderData> => {
    const walletAddress = params.walletAddress;

    const cachedWallets = getCachedData(CACHE_KEYS.WALLETS) as CachedData<Wallet[]>;

    if (!cachedWallets) {
        return { wallets: { data: null, timestamp: 0 }, walletAddress: walletAddress ? walletAddress : '' };
    }

    return {
        wallets: {
            data: cachedWallets ? cachedWallets.data : null,
            timestamp: cachedWallets ? cachedWallets.timestamp : 0
        }
        , walletAddress: walletAddress ? walletAddress : ''
    };
};

const handleAssetClick = (token: FullToken, navigate: ReturnType<typeof useNavigate>) => {
    const assetId = token.token_data ? token.token_data.id : token.zerion_data.fungible_id;
    const assetName = token.token_data ? token.token_data.name : token.zerion_data.name;
    const isFungible = token.token_data ? false : true;

    const searchParams = new URLSearchParams({
        name: assetName,
        fungible: isFungible.toString(),
    });

    navigate(`/Dashboard/asset/${assetId}?${searchParams.toString()}`);
};

const AssetTableRow: React.FC<{
    token: FullToken;
    navigate: ReturnType<typeof useNavigate>;
    formatCurrency: (value: number) => string;
    formatNumber: (value: number) => string;
    formatPercent: (value: number) => string;
    getValue: (token: FullToken) => number;
    getChange: (token: FullToken) => number;
}> = ({
    token,
    navigate,
    formatCurrency,
    formatNumber,
    formatPercent,
    getValue,
    getChange
}) => {
        const value = getValue(token);
        const change24h = getChange(token);
        const symbol = token.token_data ? token.token_data.symbol : token.zerion_data.symbol;
        const price = token.token_data ? token.token_data.price : token.zerion_data.price;
        const amount = token.token_data ? token.token_data.amount : token.zerion_data.quantity.float;
        const chain = token.zerion_data.chain;
        const absoluteChange = value * (change24h / 100);

        return (
            <div
                className="table-row"
                onClick={() => handleAssetClick(token, navigate)}
                role="button"
                tabIndex={0}
            >
                <div className="col-asset">
                    <div className="asset-info">
                        <div className="token-icon">
                            {token.zerion_data.icon && (
                                <img src={token.zerion_data.icon} alt={symbol} />
                            )}
                        </div>
                        <div className="token-details">
                            <div className="token-name">{symbol}</div>
                            <div className="token-chain">{chain}</div>
                        </div>
                    </div>
                </div>
                <div className="col-price">{formatCurrency(price)}</div>
                <div className="col-balance">{formatNumber(amount)} {symbol}</div>
                <div className="col-value">
                    <div className="value-info">
                        <div>{formatCurrency(value)}</div>
                        {change24h !== 0 && (
                            <div className={`change-value ${change24h >= 0 ? 'positive' : 'negative'}`}>
                                {formatPercent(change24h)}
                                <span className="absolute-change">
                                    {` (${formatCurrency(absoluteChange)})`}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

const SingleWalletView: React.FC = () => {
    const { wallets, walletAddress } = useLoaderData() as LoaderData;
    const [cachedWallet, setcachedWalletWallet] = useState<Wallet | null>(wallets.data ? wallets.data.find(wallet => wallet.address === walletAddress) || null : null);
    const navigate = useNavigate();
    const [showSmallValues, setShowSmallValues] = React.useState(false);
    const [loadingStates, setLoadingStates] = useState({
        wallets: !wallets.data
    });
    const activeFetches = useActiveFetches();

    useEffect(() => {
        const updateWalletData = async () => {
            if (isDataExpired(wallets.timestamp || 0)) {
                if (!isEndpointFetching(activeFetches.current, API_ENDPOINTS.WALLETS)) {
                    activeFetches.current.add(API_ENDPOINTS.WALLETS);
                    setLoadingStates(prev => ({ ...prev, wallets: true }));
                    console.log('Wallets Loading:', loadingStates.wallets);

                    try {
                        const newWallets: Wallet[] = await api.get(API_ENDPOINTS.WALLETS);

                        localStorage.setItem(CACHE_KEYS.WALLETS, JSON.stringify({
                            data: newWallets,
                            timestamp: Date.now()
                        }));

                        setcachedWalletWallet(newWallets.find(wallet => wallet.address === walletAddress) || null);
                    } catch (error) {
                        console.error('Error updating wallets:', error);
                        activeFetches.current.delete(API_ENDPOINTS.WALLETS);
                    } finally {
                        setLoadingStates(prev => ({ ...prev, wallets: false }));
                        console.log('Wallets Loading:', loadingStates.wallets);
                        activeFetches.current.delete(API_ENDPOINTS.WALLETS);
                    }
                }
            }
        };
        updateWalletData();
        const intervalId = setInterval(updateWalletData, 60000);
        return () => clearInterval(intervalId);
    }, [wallets.timestamp]);

    const getValue = (token: FullToken): number => {
        try {
            return token.token_data?.value || token.zerion_data.value || 0;
        } catch (error) {
            console.error('Error getting token value:', error);
            return 0;
        }
    };

    const getChange = (token: FullToken): number => {
        try {
            return token.token_data?.change24h || token.zerion_data.changes.percent_1d || 0;
        } catch (error) {
            console.error('Error getting token change:', error);
            return 0;
        }
    };

    const calculate24hChange = () => {
        const tokens: FullToken[] = cachedWallet?.tokens || [];
        const defiPositions: DefiPosition[] = cachedWallet?.defi_positions || [];

        // Calculate assets change
        const assetsTotalValue = tokens.reduce((acc, token) => acc + getValue(token), 0);
        const assetsChange = tokens.reduce((acc, token) => {
            const value = getValue(token);
            const change = getChange(token);
            return acc + (value * (change / 100));
        }, 0);

        // Calculate DeFi change
        const defiTotalValue = defiPositions.reduce((acc, pos) => acc + pos.value, 0);
        const defiChange = defiPositions.reduce((acc, pos) =>
            acc + pos.changes.absolute_1d, 0);

        // Calculate total percentage change
        const totalValue = assetsTotalValue + defiTotalValue;
        const totalChange = assetsChange + defiChange;

        return totalValue > 0 ? (totalChange / totalValue) * 100 : 0;
    };

    const tokens = cachedWallet?.tokens || [];

    const filteredDefiPositions = cachedWallet?.defi_positions?.filter(position =>
        showSmallValues || position.value >= 1
    ) || [];

    const defiPositions: ExtendedDefiPosition[] = filteredDefiPositions.map(position => ({
        ...position,
        walletAddress: cachedWallet ? cachedWallet.address : '',
        walletName: cachedWallet ? cachedWallet.name : ''
    }));

    const totalChange24h = calculate24hChange();
    const filteredTokens = tokens.filter(token =>
        showSmallValues || getValue(token) >= 1
    );

    const shortenAddress = (address: string, startLength: number = 8, endLength: number = 8): string => {
        return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
    };

    return (
        <div className="single-wallet-container">
            <section className="dashboard-head"
                style={{ background: `linear-gradient(to bottom, ${cachedWallet?.color}80 1%, white 10px)` }}
            >
                <div className="wallet-header">
                    <button className="back-button" onClick={() => navigate('/Dashboard')}>
                        <ArrowLeft size={20} />
                    </button>
                    {/* <div className="wallet-header-info">
                        <div className="total-label">{shortenAddress(cachedWallet ? cachedWallet.address : '')}</div>
                        <h1 style={{ color: "black" }}>{cachedWallet?.name}</h1>
                    </div> */}
                </div>
                <div className="overview-values">
                    <ValueCard
                        label={shortenAddress(cachedWallet ? cachedWallet.address : '')}
                        value={cachedWallet?.name || ''}
                        isText={true}
                        color={'#666'}
                    />
                    <ValueCard
                        label="Total"
                        value={(cachedWallet?.asset_total || 0) + (cachedWallet?.defi_total || 0)}
                        color={'#666'}
                    />
                    <ValueCard
                        label="Assets"
                        value={cachedWallet?.asset_total || 0}
                        color={'#666'}
                    />
                    {cachedWallet?.defi_total || 0 > 0 ? (
                        <ValueCard
                            label="DeFi"
                            value={cachedWallet?.defi_total || 0}
                            color={'#666'}
                        />
                    ) : null}
                    <ValueCard
                        label="Change 24h"
                        value={totalChange24h}
                        color={'#666'}
                        isPercent={true}
                    />
                </div>
            </section>

            {!cachedWallet ? (
                <LoadingOverlay message="Loading wallets..." />
            ) : (
                <div className="wallet-content">
                    <div className="assets-section">
                        <div className="section-header">
                            <div className="section-title">
                                <h2>Assets</h2>
                                <div className="section-total">{formatCurrency(cachedWallet?.asset_total || 0)}</div>
                            </div>
                            <div className="toggle-container">
                                <span className="toggle-label">Show &lt;$1</span>
                                <label className="toggle">
                                    <input
                                        type="checkbox"
                                        checked={showSmallValues}
                                        onChange={() => setShowSmallValues(!showSmallValues)}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>
                        </div>

                        <div className="assets-table">
                            <div className="table-header">
                                <div className="col-asset">ASSET</div>
                                <div className="col-price">PRICE</div>
                                <div className="col-balance">BALANCE</div>
                                <div className="col-value">VALUE</div>
                            </div>
                            {filteredTokens.map((token, index) => (
                                <AssetTableRow
                                    key={index}
                                    token={token}
                                    navigate={navigate}
                                    formatCurrency={formatCurrency}
                                    formatNumber={formatNumber}
                                    formatPercent={formatPercent}
                                    getValue={getValue}
                                    getChange={getChange}
                                />
                            ))}
                        </div>
                    </div>

                    {defiPositions.length > 0 && (
                        <DefiPositions positions={defiPositions} />
                    )}
                </div>
            )}
        </div>
    );
};

export default SingleWalletView;