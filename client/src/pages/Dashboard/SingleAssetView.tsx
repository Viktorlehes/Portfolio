import React, { useState, useEffect, useMemo } from 'react';
import { useLoaderData, useNavigate, LoaderFunction, LoaderFunctionArgs } from 'react-router-dom';
import { components } from "../../types/api-types";
import { ArrowLeft, Flag } from 'lucide-react';
import ValueCard from '../../components/Dashboard/WalletsView/ValueCard';
import TokenPriceChart, { ChartData } from '../..//components/Dashboard/AssetsView/TokenPriceChart';
import './SingleAssetView.css';
import { formatCurrency, formatNumber, formatPercent } from '../../utils/calc';
import { RefreshCcw } from 'lucide-react';
import { formatCurrencySuffix } from '../../utils/calc';
import { api, ENDPOINTS, useDataFetching } from '../../utils/api';

type Wallet = components["schemas"]["UnifiedWallet"];
type UnifiedToken = components["schemas"]["UnifiedToken"];

interface allChartsData {
    day: ChartData;
    week: ChartData;
    month: ChartData;
}

interface Position {
    walletName: string;
    walletAddress: string;
    value: number;
    amount: number;
    change24h: number;
    absoluteChange: number;
    chain: string;
    icon?: string;
    price: number;
    percentage: number;
}

interface AssetStats {
    totalValue: number;
    totalAmount: number;
    totalChange: number;
    totalAbsoluteChange: number;
    positions: Position[];
}

interface AssetLoaderData {
    assetId: string;
    wallets: {
        data: Wallet[] | null;
        timestamp: number;
      }
}

export const assetLoader: LoaderFunction = async ({
    params
}: LoaderFunctionArgs): Promise<AssetLoaderData> => {
    const cachedWallets = localStorage.getItem(ENDPOINTS.WALLETS.endpoint);
    return {
        assetId: params.assetId ? params.assetId : "" ,
        wallets: cachedWallets ? JSON.parse(cachedWallets) : {
            data: null,
            timestamp: 0
        }
    };
};

async function fetchChartData(fungible_id: string) {
    return await api.post<allChartsData, object>('/chart/', {fungible_id});
}

async function fetchTokenData(fungible_id: string) {
    return await api.post<UnifiedToken, object>('/token/', {id: fungible_id, id_type: "zerion_id" });
}

const SingleAssetView: React.FC = () => {
    const { assetId, wallets } = useLoaderData() as AssetLoaderData;
    const walletState = useDataFetching<Wallet[]>({
        ...ENDPOINTS.WALLETS,
        initialData: wallets
      });
    const [tokenData, setTokenData] = useState<UnifiedToken | null>(null);
    const [showSmallValues, setShowSmallValues] = useState<boolean>(true);
    const [assetStats, setAssetStats] = useState<AssetStats | null>(null);
    const [chartData, setChartData] = useState<allChartsData | null>(null);
    const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('day');
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const navigate = useNavigate();
    const [showNull, setShowNull] = useState({
        token: true,
        chartData: true
    });

    useEffect(() => {
        setShowNull({
            token: !tokenData,
            chartData: !chartData
            });
    }, [tokenData, chartData]);

    useEffect(() => {
        const fetchData = async () => {
            const chartData = await fetchChartData(assetId)
            if (chartData.success) {
                setChartData(chartData.data)
            }
            const tokenData = await fetchTokenData(assetId)
            if (tokenData.success) {
                setTokenData(tokenData.data)
            }
        }

        fetchData()
    }, [walletState.data])
    

    const shortenAddress = (address: string, startLength: number = 8, endLength: number = 8): string => {
        return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
    };

    const onViewWallet = (address: string) => {
        navigate(`/dashboard/wallet/${address}`);
    };

    const calculateAssetStats = (): AssetStats => {
        let totalValue = 0;
        let totalAmount = 0;
        let positions: Position[] = [];
        

        if (!walletState.data) {
            return {
                totalValue,
                totalAmount,
                totalChange: 0,
                totalAbsoluteChange: 0,
                positions: []
            };
        }

        const total24hChange = tokenData?.price_data.percent_change_24h || 0;

        // Process all wallets
        walletState.data?.forEach(wallet => {
            if (!wallet.tokens) return;
            wallet.tokens.forEach(token => {
                    const matchesFungibleId = token.token_id === assetId;
                    const matchesName = token.name == tokenData?.name;
                    if (matchesFungibleId || matchesName) {
                        const value = token.value_usd;
                        const amount = token.amount
                        const change24h = token.price_24h_change;
                        const absoluteChange = (value * change24h) / 100;

                        totalValue += value;
                        totalAmount += amount;

                        positions.push({
                            walletName: wallet.name,
                            walletAddress: wallet.address!,
                            value,
                            amount,
                            change24h: total24hChange,
                            absoluteChange,
                            chain: token.chain || "",
                            icon: token.icon || "",
                            price: tokenData?.price_data.price || 0,
                            percentage: 0
                        });
                    }
            });
        });

        // Calculate percentages
        positions = positions.map(position => ({
            ...position,
            percentage: (position.value / totalValue) * 100
        }));

        return {
            totalValue,
            totalAmount,
            totalChange: total24hChange,
            totalAbsoluteChange: (totalValue * total24hChange) / 100,
            positions: positions
                .filter(pos => showSmallValues || pos.value >= 1)
                .sort((a, b) => b.value - a.value)
        };
    };

    useEffect(useMemo(() => () => {
        if (walletState.data && tokenData) {
            setAssetStats(calculateAssetStats());
        }
    }
    , [walletState.data, tokenData]), [walletState.data, tokenData]);

    return (
        <div className="single-wallet-container">
            <section className="dashboard-head">
                <div className="wallet-header">
                    <button
                        className="back-button"
                        onClick={() => navigate('/Dashboard')}
                        aria-label="Back to Dashboard"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    {!showNull.token && tokenData?.logo_url ? (
                        <img src={tokenData!.logo_url ? tokenData!.logo_url : "" } alt={""} style={{ 'width': '40px', 'height': '40px' }} />
                    ) : (
                        null
                    ) }
                    <h1>{!showNull.token ? tokenData?.name : "-"} ({!showNull.token ? tokenData?.symbol : "-"})</h1>
                </div>
                <div className="overview-values">
                    <ValueCard
                        label="Price"
                        value={!showNull.token ? tokenData?.price_data.price! : 0}
                        color={'#666'}
                    />
                    <ValueCard
                        label="Total Value"
                        value={assetStats?.totalValue || 0}
                        color={'#666'}
                    />
                    <ValueCard
                        label="Total Amount"
                        value={Number(assetStats?.totalAmount.toFixed(2)) || 0}
                        color={'#666'}
                        isText={true}
                    />
                    <ValueCard
                        label="24h Change"
                        value={!showNull.token ? tokenData?.price_data.percent_change_24h! : 0}
                        color={'#666'}
                        isPercent={true}
                    />
                </div>
                <div className="overview-edit">
                    <button
                        className="flag-button"
                        aria-label="Flag Asset"
                    >
                        <Flag size={20} />
                    </button>
                </div>
            </section>

            <div className="chart-data-wrapper">
                <div className="chart-header">
                    <section className="chart-periods">
                        <div className="time-period">
                            <span className="period-label">1 Day</span>
                            <span className={`period-value ${(!showNull.token && (tokenData?.price_data.percent_change_24h || 0) >= 0) ? 'positive' : 'negative'}`}>
                                {showNull.token ? '-' : `${tokenData?.price_data.percent_change_24h!.toFixed(2)}%`}
                            </span>
                        </div>
                        <div className="time-period">
                            <span className="period-label">7 Days</span>
                            <span className={`period-value ${(!showNull.token && (tokenData?.price_data.percent_change_7d! || 0) >= 0) ? 'positive' : 'negative'}`}>
                            {showNull.token ? '-' : `${tokenData?.price_data.percent_change_7d!.toFixed(2)}%`}
                            </span>
                        </div>
                        <div className="time-period">
                            <span className="period-label">30 Days</span>
                            <span className={`period-value ${(!showNull.token && (tokenData?.price_data.percent_change_30d! || 0) >= 0) ? 'positive' : 'negative'}`}>
                            {showNull.token ? '-' : `${tokenData?.price_data.percent_change_30d!.toFixed(2)}%`}
                            </span>
                        </div>
                        <div className="time-period">
                            <span className="period-label">90 Days</span>
                            <span className={`period-value ${(!showNull.token && (tokenData?.price_data.percent_change_90d! || 0) >= 0) ? 'positive' : 'negative'}`}>
                            {showNull.token ? '-' : `${tokenData?.price_data.percent_change_90d!.toFixed(2)}%`}
                            </span>
                        </div>
                        <div className="time-period">
                            <span className="period-label">Market Cap</span>
                            <span className="period-value">
                                {showNull.token ? '-' : formatCurrencySuffix(tokenData?.price_data.market_cap || 0)}
                            </span>
                        </div>
                        <div className="time-period">
                            <span className="period-label">Circulating Supply</span>
                            <span className="period-value">
                            {showNull.token ? '-' : formatCurrencySuffix(tokenData?.circulating_supply || 0)}
                            </span>
                        </div>
                        <div className="time-period">
                            <span className="period-label">Total Supply</span>
                            <span className="period-value">
                            {showNull.token ? '-' : formatCurrencySuffix(tokenData?.total_supply || 0)}
                            </span>
                        </div>
                    </section>
                    <div className="chart-controls">
                        <select
                            value={selectedPeriod}
                            onChange={(e) => setSelectedPeriod(e.target.value as 'day' | 'week' | 'month')}
                            className="period-select"
                        >
                            <option value="day">1 Day</option>
                            <option value="week">1 Week</option>
                            <option value="month">1 Month</option>
                        </select>
                    </div>
                </div>
                <div className="chart-section">
                    {showNull.chartData ? (
                        <div className="loading-chart">
                            <RefreshCcw size={32} color="#8b5cf6" />
                        </div>
                    ) : chartData ? (
                        <TokenPriceChart chartData={chartData[selectedPeriod]} />
                    ) : (
                        <div className="no-data">No chart data available</div>
                    )}
                </div>
            </div>

            <div>
                <div className="sa-assets-section">
                    <div className="section-header">
                        <div className="section-title">
                            <h2>Assets</h2>
                            <div className="section-total">{formatCurrency(assetStats?.totalValue || 0, 2, 2)}</div>
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

                    <div className="sa-assets-table">
                        <div className="table-header">
                            <div className="col-asset">WALLET</div>
                            <div className="col-chain">CHAIN</div>
                            <div className="col-balance">BALANCE</div>
                            <div className="col-value">VALUE</div>
                            <div className="col-percent">%</div>
                        </div>
                        {assetStats ? assetStats.positions.map((position, index) => (
                            <div
                                key={index}
                                className="table-row clickable"
                                onClick={() => onViewWallet(position.walletAddress)}
                            >
                                <div className="col-asset">
                                    <div className="asset-info">
                                        <div className="token-icon">
                                            {position.icon ? (
                                                <img src={position.icon} alt={position.walletName} />
                                            ) : (
                                                <img src="/api/placeholder/32/32" alt="" />
                                            )}
                                        </div>
                                        <div className="token-details">
                                            <div className="token-name">{position.walletName}</div>
                                            <div className="wallet-address">{shortenAddress(position.walletAddress)}</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-chain">{position.chain}</div>
                                <div className="col-balance">
                                    {formatNumber(position.amount)}
                                </div>
                                <div className="col-value">
                                    <div className="value-info">
                                        <div>{formatCurrency(position.value, 2, 2)}</div>
                                        {position.change24h !== 0 && (
                                            <div className={`change-value ${position.change24h >= 0 ? 'positive' : 'negative'}`}>
                                                {formatPercent(position.change24h)}
                                                <span className="absolute-change">
                                                    ({formatCurrency(position.absoluteChange, 2, 2)})
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="col-percent">
                                    {position.percentage.toFixed(1)}%
                                </div>
                            </div>
                        )) :
                            <div className="table-row">
                                <div className="no-data">No data available</div>
                            </div>
                        }
                    </div>
                </div>
            </div>
            {!showNull.token && (
                <div className="description-section">
                    {tokenData?.description && (
                        <>
                            <h2>About {tokenData?.name}</h2>
                            <div
                                className={`description-text ${!isDescriptionExpanded ? 'collapsed' : ''}`}
                                dangerouslySetInnerHTML={{
                                    __html: tokenData?.description
                                }}
                            />
                            <button
                                className="see-more-button"
                                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                            >
                                {isDescriptionExpanded ? 'See less' : 'See more'}
                            </button>
                        </>
                    )}
                    <div className="external-links">
                        {tokenData?.external_links ? tokenData?.external_links.map((link, index) => (
                            <a
                                key={index}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="external-link"
                            >
                                {link.name} <span className="link-arrow">↗</span>
                            </a>
                        )) : null}
                    </div>
                </div>
            )}
            {!showNull.token && (
                <div className="explorers-section">
                    <h2>Active on Chains</h2>
                    <div className="explorers-grid">
                        {tokenData?.implementations ? tokenData?.implementations.map((impl, index) => (
                            <div key={index} className="explorer-card">
                                <div className="explorer-info">
                                    <div className="chain-icon">
                                        {/* You might want to add chain icons here */}
                                        <img src={`/chain-icons/${impl.chain_id}.png`} alt={impl.chain_id} />
                                    </div>
                                    <div className="chain-details">
                                        <div className="chain-name">
                                            {impl.chain_id.split('-').map(word =>
                                                word.charAt(0).toUpperCase() + word.slice(1)
                                            ).join(' ')}
                                        </div>
                                        {impl.address && (
                                            <div className="chain-address">
                                                {shortenAddress(impl.address)}
                                                <button
                                                    className="copy-button"
                                                    onClick={() => navigator.clipboard.writeText(impl.address || '')}
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                                    </svg>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )) : null}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SingleAssetView;