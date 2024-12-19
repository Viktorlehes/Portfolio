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

type Wallet = components["schemas"]["Wallet"];
type FullToken = components["schemas"]["FullToken"];
type ZerionToken = components["schemas"]["ZerionToken"];

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
    assetName: string;
    isFungible: boolean;
    wallets: {
        data: Wallet[] | null;
        timestamp: number;
      }
}

export const assetLoader: LoaderFunction = async ({
    params,
    request
}: LoaderFunctionArgs): Promise<AssetLoaderData> => {
    const url = new URL(request.url);
    const assetName = url.searchParams.get('name') || '';
    const isFungible = url.searchParams.get('fungible') === 'true';

    if (!params.assetId) {
        throw new Error('Asset ID is required');
    }

    const cachedWallets = localStorage.getItem(ENDPOINTS.WALLETS.endpoint);

    return {
        assetId: params.assetId,
        assetName,
        isFungible,
        wallets: cachedWallets ? JSON.parse(cachedWallets) : {
            data: null,
            timestamp: 0
        }
    };
};

async function fetchZerionToken(fungible_id: string): Promise<ZerionToken> {
    return api.post('/tokens/zerionToken', { fungible_id });
}

async function fetchChartData(fungible_id: string): Promise<allChartsData> {
    return api.post('/dashboard/allCharts', { fungible_id });
}

function getFungibleId(wallets: Wallet[], assetId: string, assetName: string, isFungible: boolean): string {
    if (isFungible) {
        return assetId;
    }

    for (const wallet of wallets) {
        if (!wallet.tokens) continue;

        const tokenByData = wallet.tokens.find(token =>
            token.token_data?.name === assetName
        );
        if (tokenByData) {
            return tokenByData.zerion_data.fungible_id;
        }

        const tokenByZerion = wallet.tokens.find(token =>
            token.zerion_data.name === assetName
        );
        if (tokenByZerion) {
            return tokenByZerion.zerion_data.fungible_id;
        }
    }
    return '';
}

const SingleAssetView: React.FC = () => {
    const { assetId, assetName, isFungible, wallets } = useLoaderData() as AssetLoaderData;
    const walletState = useDataFetching<Wallet[]>({
        ...ENDPOINTS.WALLETS,
        initialData: wallets
      });
    const navigate = useNavigate();
    const [showSmallValues, setShowSmallValues] = useState<boolean>(true);
    const [assetStats, setAssetStats] = useState<AssetStats | null>(null);
    const [chartData, setChartData] = useState<allChartsData | null>(null);
    const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('day');
    const [zerionTokenData, setZerionTokenData] = useState<ZerionToken | null>(null);
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const [loadingStates, setLoadingStates] = useState({
        zerionToken: false,
        chartData: false
    });

    useEffect(() => {
        const fetchData = async () => {
            if (!walletState.data) {
                setLoadingStates(prev => ({ ...prev, zerionToken: true, chartData: true }));
                return;
            };
            const fungible_id = walletState.data && getFungibleId(walletState.data, assetId, assetName, isFungible) || '';

            try {
                // Fetch Zerion token data
                setLoadingStates(prev => ({ ...prev, zerionToken: true }));
                const tokenData = await fetchZerionToken(fungible_id);
                setZerionTokenData(tokenData);

                setLoadingStates(prev => ({ ...prev, zerionToken: false }));

                // Check cache for chart data
                setLoadingStates(prev => ({ ...prev, chartData: true }));
                const newChartData = await fetchChartData(fungible_id);
                setChartData(newChartData);

                setLoadingStates(prev => ({ ...prev, chartData: false }));
            } catch (error) {
                console.error('Error fetching data:', error);
                setLoadingStates(prev => ({ ...prev, zerionToken: true, chartData: true }));
            }
        };

        fetchData();
    }, [walletState.data]);

    const shortenAddress = (address: string, startLength: number = 8, endLength: number = 8): string => {
        return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
    };

    const onViewWallet = (address: string) => {
        navigate(`/dashboard/wallet/${address}`);
    };

    const getValue = (token: FullToken): number => {
        try {
            return token.token_data?.value || token.zerion_data.value || 0;
        } catch (error) {
            console.error('Error getting token value:', error);
            return 0;
        }
    };

    const calculateAssetStats = (): AssetStats => {
        let totalValue = 0;
        let totalAmount = 0;
        let positions: Position[] = [];
        let processedTokenIds = new Set<string>();

        if (!walletState.data) {
            return {
                totalValue,
                totalAmount,
                totalChange: 0,
                totalAbsoluteChange: 0,
                positions: []
            };
        }

        const zerion24hChange = zerionTokenData?.data.attributes.market_data.changes.percent_1d || 0;

        // Process all wallets
        walletState.data?.forEach(wallet => {
            if (!wallet.tokens) return;

            // For fungible tokens
            if (isFungible) {
                wallet.tokens.forEach(token => {
                    // Check if this token matches our criteria
                    const matchesFungibleId = token.zerion_data.fungible_id === assetId;
                    const matchesName = token.zerion_data.name === assetName ||
                        token.token_data?.name === assetName;

                    if (matchesFungibleId || matchesName) {
                        processedTokenIds.add(token.zerion_data.fungible_id);

                        const value = getValue(token);
                        const amount = token.token_data?.amount || token.zerion_data.quantity.float;
                        const change24h = zerion24hChange;
                        const absoluteChange = (value * change24h) / 100;

                        totalValue += value;
                        totalAmount += amount;

                        positions.push({
                            walletName: wallet.name,
                            walletAddress: wallet.address,
                            value,
                            amount,
                            change24h,
                            absoluteChange,
                            chain: token.zerion_data.chain,
                            icon: token.zerion_data.icon,
                            price: token.token_data?.price || token.zerion_data.price,
                            percentage: 0
                        });
                    }
                });
            } else {
                // For non-fungible tokens
                wallet.tokens.forEach(token => {
                    if (token.token_data?.id === assetId || token.token_data?.name === assetName) {
                        const value = getValue(token);
                        const amount = token.token_data?.amount || token.zerion_data.quantity.float;
                        const change24h = zerion24hChange;
                        const absoluteChange = (value * change24h) / 100;

                        totalValue += value;
                        totalAmount += amount;

                        positions.push({
                            walletName: wallet.name,
                            walletAddress: wallet.address,
                            value,
                            amount,
                            change24h,
                            absoluteChange,
                            chain: token.zerion_data.chain,
                            icon: token.zerion_data.icon,
                            price: token.token_data?.price || token.zerion_data.price,
                            percentage: 0
                        });

                    }
                });
            }
        });

        // Calculate percentages
        positions = positions.map(position => ({
            ...position,
            percentage: (position.value / totalValue) * 100
        }));

        return {
            totalValue,
            totalAmount,
            totalChange: zerion24hChange,
            totalAbsoluteChange: (totalValue * zerion24hChange) / 100,
            positions: positions
                .filter(pos => showSmallValues || pos.value >= 1)
                .sort((a, b) => b.value - a.value)
        };
    };

    useEffect(useMemo(() => () => {
        if (walletState.data) {
            setAssetStats(calculateAssetStats());
        }
    }
    , [walletState.data, showSmallValues]), [walletState.data, showSmallValues]);

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
                    {zerionTokenData?.data.attributes.icon.url && (
                        <img src={zerionTokenData.data.attributes.icon.url} alt={assetName} style={{ 'width': '40px', 'height': '40px' }} />
                    )}
                    <h1>{assetName} ({zerionTokenData?.data.attributes.symbol})</h1>
                </div>
                <div className="overview-values">
                    <ValueCard
                        label="Price"
                        value={loadingStates.zerionToken || !zerionTokenData ? 0 : zerionTokenData.data.attributes.market_data.price}
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
                        value={loadingStates.zerionToken || !zerionTokenData ? 0 : zerionTokenData.data.attributes.market_data.changes.percent_1d}
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
                            <span className={`period-value ${(!loadingStates.zerionToken && (zerionTokenData?.data.attributes.market_data.changes.percent_1d ?? 0) >= 0) ? 'positive' : 'negative'}`}>
                                {loadingStates.zerionToken || !zerionTokenData ? '-' : `${zerionTokenData.data.attributes.market_data.changes.percent_1d.toFixed(2)}%`}
                            </span>
                        </div>
                        <div className="time-period">
                            <span className="period-label">1 Month</span>
                            <span className={`period-value ${(!loadingStates.zerionToken && (zerionTokenData?.data.attributes.market_data.changes.percent_30d ?? 0) >= 0) ? 'positive' : 'negative'}`}>
                                {loadingStates.zerionToken || !zerionTokenData ? '-' : `${zerionTokenData.data.attributes.market_data.changes.percent_30d.toFixed(2)}%`}
                            </span>
                        </div>
                        <div className="time-period">
                            <span className="period-label">3 Months</span>
                            <span className={`period-value ${(!loadingStates.zerionToken && (zerionTokenData?.data.attributes.market_data.changes.percent_90d ?? 0) >= 0) ? 'positive' : 'negative'}`}>
                                {loadingStates.zerionToken || !zerionTokenData ? '-' : `${zerionTokenData.data.attributes.market_data.changes.percent_90d.toFixed(2)}%`}
                            </span>
                        </div>
                        <div className="time-period">
                            <span className="period-label">1 Year</span>
                            <span className={`period-value ${(!loadingStates.zerionToken && (zerionTokenData?.data.attributes.market_data.changes.percent_365d ?? 0) >= 0) ? 'positive' : 'negative'}`}>
                                {loadingStates.zerionToken || !zerionTokenData ? '-' : `${zerionTokenData.data.attributes.market_data.changes.percent_365d.toFixed(2)}%`}
                            </span>
                        </div>
                        <div className="time-period">
                            <span className="period-label">Market Cap</span>
                            <span className="period-value">
                                {loadingStates.zerionToken || !zerionTokenData ? '-' : formatCurrencySuffix(zerionTokenData.data.attributes.market_data.market_cap)}
                            </span>
                        </div>
                        <div className="time-period">
                            <span className="period-label">Circulating Supply</span>
                            <span className="period-value">
                                {loadingStates.zerionToken || !zerionTokenData ? '-' : formatCurrencySuffix(zerionTokenData.data.attributes.market_data.circulating_supply)}
                            </span>
                        </div>
                        <div className="time-period">
                            <span className="period-label">Total Supply</span>
                            <span className="period-value">
                                {loadingStates.zerionToken || !zerionTokenData ? '-' : formatCurrencySuffix(zerionTokenData.data.attributes.market_data.total_supply)}
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
                    {loadingStates.chartData ? (
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
                                                <img src="/api/placeholder/32/32" alt="wallet" />
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
            {zerionTokenData && (
                <div className="description-section">
                    {zerionTokenData.data.attributes.description && (
                        <>
                            <h2>About {zerionTokenData.data.attributes.name}</h2>
                            <div
                                className={`description-text ${!isDescriptionExpanded ? 'collapsed' : ''}`}
                                dangerouslySetInnerHTML={{
                                    __html: zerionTokenData.data.attributes.description
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
                        {zerionTokenData.data.attributes.external_links.map((link, index) => (
                            <a
                                key={index}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="external-link"
                            >
                                {link.name} <span className="link-arrow">↗</span>
                            </a>
                        ))}
                    </div>
                </div>
            )}
            {zerionTokenData && (
                <div className="explorers-section">
                    <h2>Active on Chains</h2>
                    <div className="explorers-grid">
                        {zerionTokenData.data.attributes.implementations.map((impl, index) => (
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
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SingleAssetView;