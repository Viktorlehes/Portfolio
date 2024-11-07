import React from "react";
import { useLoaderData, useNavigate, LoaderFunction, LoaderFunctionArgs } from "react-router-dom";
import { components } from "../../types/api-types";
import { ArrowLeft, RefreshCcw } from "lucide-react";
import ValueCard from "../../components/Dashboard/WalletsView/ValueCard";
import "./SingleWalletView.css";

type Wallet = components["schemas"]["Wallet"];
type FullToken = components["schemas"]["FullToken"];
type DefiPosition = components["schemas"]["DefiPosition"];

export const walletLoader: LoaderFunction = async ({ params }: LoaderFunctionArgs) => {
    const walletAddress = params.walletAddress;
    const walletsJSON = localStorage.getItem('wallets');

    if (!walletsJSON) {
        throw new Error('No wallets found');
    }

    const wallets: Wallet[] = JSON.parse(walletsJSON);
    const wallet = wallets.find(w => w.address === walletAddress);

    if (!wallet) {
        throw new Error('Wallet not found');
    }

    return { wallet };
};

const SingleWalletView: React.FC = () => {
    const { wallet } = useLoaderData() as { wallet: Wallet };
    const navigate = useNavigate();
    const [showSmallValues, setShowSmallValues] = React.useState(false);

    const calculate24hChange = (items: (FullToken | DefiPosition)[]) => {
        return items.reduce((acc, item) => {
            const change = item.hasOwnProperty('token_data')
                ? (item as FullToken).token_data?.change24h || 0
                : (item as DefiPosition).changes.percent_1d || 0;
            return acc + change;
        }, 0);
    };

    const tokens = wallet.tokens || [];
    const defiPositions = wallet.defi_positions || [];

    const groupedDefiPositions = defiPositions
        .filter(position => showSmallValues || position.value >= 1)
        .reduce((acc, position) => {
            const protocol = position.protocol;
            if (!acc[protocol]) {
                acc[protocol] = [];
            }
            acc[protocol].push(position);
            return acc;
        }, {} as Record<string, DefiPosition[]>);

    const totalChange24h = calculate24hChange([...tokens, ...defiPositions]);
    const filteredTokens = tokens.filter(token =>
        showSmallValues || (token.token_data ? token.token_data.value : token.zerion_data.value) >= 1
    );

    const formatCurrency = (value: number): string => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value);
    };

    const formatNumber = (value: number): string => {
        return new Intl.NumberFormat("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 4,
        }).format(value);
    };

    return (
        <div className="single-wallet-container">
            <section className="dashboard-head" style={{ justifyContent: 'space-evenly', borderTop: `3px solid ${wallet.color}` }}>
                <div className="wallet-header">
                    <button className="back-button" onClick={() => navigate('/Dashboard')}>
                        <ArrowLeft size={20} />
                    </button>
                    <h1 style={{ color: wallet.color }}>{wallet.name}</h1>
                </div>
                <div className="overview-values">
                    <ValueCard
                        label="Total"
                        value={wallet.asset_total + wallet.defi_total}
                        color={ '#666'}
                    />
                    <ValueCard
                        label="Assets"
                        value={wallet.asset_total}
                        color={'#666'}
                    />
                    {wallet.defi_total > 0 && (
                        <ValueCard
                            label="DeFi"
                            value={wallet.defi_total}
                            color={'#666'}
                        />
                    )}
                    <ValueCard
                        label="Change 24h"
                        value={totalChange24h}
                        color={'#666'}
                        isPercent={true}
                    />
                </div>
                <div className="overview-edit">
                    <button>
                        <RefreshCcw size={20} />
                    </button>
                </div>
            </section>

            <div className="wallet-content">
                <div className="assets-section">
                    <div className="section-header">
                        <div className="section-title">
                            <h2>Assets</h2>
                            <div className="section-total">{formatCurrency(wallet.asset_total)}</div>
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
                        {filteredTokens.map((token, index) => {
                            const value = token.token_data ? token.token_data.value : token.zerion_data.value;
                            const change24h = token.token_data?.change24h || 0;
                            const symbol = token.token_data ? token.token_data.symbol : token.zerion_data.symbol;
                            const price = token.token_data ? token.token_data.price : token.zerion_data.price;
                            const amount = token.token_data ? token.token_data.amount : token.zerion_data.quantity.float;
                            const chain = token.zerion_data.chain;

                            return (
                                <div key={index} className="table-row">
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
                                                    {change24h > 0 ? '+' : ''}{formatCurrency(change24h)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {defiPositions.length > 0 && (
                    <div className="assets-section">
                        <div className="section-header">
                            <div className="section-title">
                                <h2>DeFi Positions</h2>
                                <div className="section-total">{formatCurrency(wallet.defi_total)}</div>
                            </div>
                        </div>

                        {Object.entries(groupedDefiPositions).map(([protocol, positions]) => (
                            positions.length > 0 && (
                                <div key={protocol} className="defi-protocol-group">
                                    <div className="protocol-header">
                                        <div className="protocol-info">
                                            <div className="token-icon">
                                                <img src={positions[0].icon} alt={protocol} />
                                            </div>
                                            <div className="protocol-name">
                                                {protocol.toUpperCase()}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="assets-table">
                                        <div className="table-header">
                                            <div className="col-asset">POSITION</div>
                                            <div className="col-type">TYPE</div>
                                            <div className="col-balance">BALANCE</div>
                                            <div className="col-value">VALUE</div>
                                        </div>

                                        {positions.map((position, index) => (
                                            <div key={index} className="table-row">
                                                <div className="col-asset">
                                                    <div className="asset-info">
                                                        <div className="token-icon">
                                                            <img src={position.icon} alt={position.name} />
                                                        </div>
                                                        <div className="token-details">
                                                            <div className="token-name">{position.name}</div>
                                                            <div className="token-chain">{position.chain}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="col-type">
                                                    <div className="position-type">
                                                        {position.position_type}
                                                    </div>
                                                </div>
                                                <div className="col-balance">
                                                    {formatNumber(position.quantity.float)} {position.symbol}
                                                </div>
                                                <div className="col-value">
                                                    <div className={`value-info ${position.position_type === 'loan' ? 'loan-value' : ''}`}>
                                                        {formatCurrency(position.value)}
                                                        {position.changes.absolute_1d !== 0 && (
                                                            <div className={`change-value ${position.changes.absolute_1d >= 0 ? 'positive' : 'negative'}`}>
                                                                {position.changes.absolute_1d > 0 ? '+' : ''}
                                                                {formatCurrency(position.changes.absolute_1d)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SingleWalletView;