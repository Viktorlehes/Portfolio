import React, { useEffect, useState } from "react";
import { useLoaderData, useNavigate, LoaderFunction, LoaderFunctionArgs } from "react-router-dom";
import { components } from "../../types/api-types";
import { ArrowLeft } from "lucide-react"; 4
import ValueCard from "../../components/Dashboard/WalletsView/ValueCard";
import DefiPositions from "../../components/Dashboard/WalletView/DefiPositions";
import "./SingleWalletView.css";
import { formatCurrency, formatPercent, formatNumber } from "../../utils/calc";
import LoadingOverlay from "../../components/Default/LoadingOverlay";
import { ExtendedDefiPosition } from "../Defi/Defi";
import { ENDPOINTS, useDataFetching } from "../../utils/api";

type Wallet = components["schemas"]["UnifiedWallet"];
type WalletToken = components["schemas"]["WalletToken"];
type DefiPosition = components["schemas"]["DefiPosition"];

interface LoaderData {
    wallets: {
        data: Wallet[] | null;
        timestamp: number;
    };
    walletAddress: string;
}

export const walletLoader: LoaderFunction = async ({ params }: LoaderFunctionArgs): Promise<LoaderData> => {
    const walletAddress = params.walletAddress;
    const cachedWallets = localStorage.getItem(ENDPOINTS.WALLETS.endpoint);
    return {
        wallets: cachedWallets ? JSON.parse(cachedWallets) : {
            data: null,
            timestamp: 0
        }
        , walletAddress: walletAddress ? walletAddress : ''
    };
};

const handleAssetClick = (token: WalletToken, navigate: ReturnType<typeof useNavigate>) => {
    const assetId = token.token_id;
    const assetName = token.name;
    const isFungible = false

    const searchParams = new URLSearchParams({
        name: assetName,
        fungible: isFungible.toString(),
    });

    navigate(`/Dashboard/asset/${assetId}?${searchParams.toString()}`);
};

const AssetTableRow: React.FC<{
    token: WalletToken;
    navigate: ReturnType<typeof useNavigate>;
    formatCurrency: (value: number) => string;
    formatNumber: (value: number) => string;
    formatPercent: (value: number) => string;
}> = ({
    token,
    navigate,
    formatCurrency,
    formatNumber,
    formatPercent,
}) => {
        const value = token.value_usd;
        const change24h = token.price_24h_change;
        const symbol = token.symbol
        const price = token.price_usd
        const amount = token.amount
        const chain = token.chain;
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
                            {token.icon && (
                                <img src={token.icon} alt={symbol} />
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
    const { walletAddress, wallets } = useLoaderData() as LoaderData;
    const walletState = useDataFetching<Wallet[]>({
        ...ENDPOINTS.WALLETS,
        initialData: wallets
      });
    const [cachedWallet, setcachedWalletWallet] = useState<Wallet | null>(walletState.data?.find(wallet => wallet.address === walletAddress) || null);
    const navigate = useNavigate();
    const [showSmallValues, setShowSmallValues] = useState(false);
    const [showNull, setShowNull] = useState(walletState.isLoading)

    useEffect(() => {
        setShowNull(walletState.isLoading || !!walletState.error)

        if (!showNull && walletState.data) {
            setcachedWalletWallet(walletState.data.find(wallet => wallet.address === walletAddress) || null);
        }
    }, [walletState.data, walletAddress]);

    const calculate24hChange = () => {
        const tokens: WalletToken[] = cachedWallet?.tokens || [];
        const defiPositions: DefiPosition[] = cachedWallet?.defi_positions || [];

        // Calculate assets change
        const assetsTotalValue = cachedWallet!.total_value_assets || 0
        const assetsChange = tokens.reduce((acc, token) => {
            const value = token.value_usd;
            const change = token.price_24h_change;
            return acc + (value * (change / 100));
        }, 0);

        // Calculate DeFi change
        const defiTotalValue = cachedWallet!.total_value_defi || 0
        const defiChange = defiPositions.reduce((acc, pos) =>
            acc + pos.price_data.price_change_24h! , 0);

        // Calculate total percentage change
        const totalValue = assetsTotalValue + defiTotalValue;
        const totalChange = assetsChange + defiChange;

        return totalValue > 0 ? (totalChange / totalValue) * 100 : 0;
    };

    const tokens = !showNull && cachedWallet!.tokens || [];

    const filteredDefiPositions = !showNull && cachedWallet!.defi_positions?.filter(position =>
        showSmallValues || position.price_data.current_value >= 1
    ) || [];

    const defiPositions: ExtendedDefiPosition[] = !showNull && filteredDefiPositions.map(position => ({
        ...position,
        walletAddress: cachedWallet!.address || "",
        walletName: cachedWallet!.name
    })) || [];

    const totalChange24h = !showNull && calculate24hChange() || 0;
    const filteredTokens = tokens.filter(token =>
        showSmallValues || token.value_usd >= 1
    );

    const shortenAddress = (address: string, startLength: number = 8, endLength: number = 8): string => {
        return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
    };

    return (
        <div className="single-wallet-container">
            <section className="wallet-dashboard-head"
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
                <div className="wallet-overview-values">
                    <ValueCard
                        label={shortenAddress(cachedWallet?.address || '')}
                        value={cachedWallet?.name || ''}
                        isText={true}
                        color={'#666'}
                    />
                    <ValueCard
                        label="Total"
                        value={(cachedWallet?.total_value_assets || 0) + (cachedWallet?.total_value_defi || 0) || 0}
                        color={'#666'}
                    />
                    <ValueCard
                        label="Assets"
                        value={cachedWallet?.total_value_assets || 0}
                        color={'#666'}
                    />
                    {cachedWallet?.total_value_defi || 0 > 0 ? (
                        <ValueCard
                            label="DeFi"
                            value={cachedWallet?.total_value_defi || 0}
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
                <LoadingOverlay message="Loading wallet..." />
            ) : (
                <div className="wallet-content">
                    <div className="assets-section">
                        <div className="section-header">
                            <div className="section-title">
                                <h2>Assets</h2>
                                <div className="section-total">{formatCurrency(cachedWallet?.total_value_assets || 0)}</div>
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