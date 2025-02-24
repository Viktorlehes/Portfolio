import React from "react";
import { useDataFetching, ENDPOINTS } from "../../utils/api";
import { components } from "../../types/api-types";
import ValueCard from "../../components/Dashboard/WalletsView/ValueCard";
import "./Defi.css";
import DefiPositions from "../../components/Dashboard/WalletView/DefiPositions";
import LoadingOverlay from "../../components/Default/LoadingOverlay";
import { calculate24hDefiChange } from "../../utils/calc";

type Wallet = components["schemas"]["UnifiedWallet"];
type DefiPosition = components["schemas"]["DefiPosition"];

export interface ExtendedDefiPosition extends DefiPosition {
    walletAddress: string;
    walletName: string;
}

const DefiView: React.FC = () => {
    const walletState = useDataFetching<Wallet[]>(ENDPOINTS.WALLETS);
    const [showSmallValues, setShowSmallValues] = React.useState(false);

    const total24hChange = walletState.data ? calculate24hDefiChange(walletState.data) : 0; 
    const totalValue = walletState.data ? walletState.data.reduce((acc, wallet) => {
        return acc += wallet.total_value_defi || 0
    }, 0) : 0

    const defiPositions: ExtendedDefiPosition[] = walletState.data ? walletState.data.reduce((acc, wallet) => {
        const defiPositions = (wallet.defi_positions || []).map(position => ({
            ...position,
            walletAddress: wallet.address || "",
            walletName: wallet.name
        }));
        return [...acc, ...defiPositions];
    }, [] as ExtendedDefiPosition[]) : [];

    const filteredDefiPositions = defiPositions.filter(position =>
        showSmallValues || position.price_data.current_value >= 1);

    return (
        <div className="default-page">
            <div className="page-header">
                <div className="custom-headers">
                    <h1>DeFi</h1>
                </div>
            </div>
            <div className="page-content">
                <section className="defi-head">
                    <div className="defi-head-values">
                        <ValueCard
                            key={"defiTotal"}
                            label={"DeFi Total"}
                            value={totalValue}
                            color={'black'}
                        />
                        <ValueCard
                            key={"24hChange"}
                            label={"24h Change"}
                            value={total24hChange}
                            color={'black'}
                            isPercent={true}
                        />
                        <ValueCard
                            key={"numPositions"}
                            label={"Active Positions"}
                            value={filteredDefiPositions.length}
                            color={'black'}
                            isText={true}
                        />
                    </div>
                    <div className="defi-overview-edit">
                        <div className="defi-toggle-container">
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
                </section>

                <section className="defi-sub-cat">
                    {filteredDefiPositions.length > 0 && (
                        <DefiPositions positions={filteredDefiPositions} displayTotal={false} />
                    )}
                </section>
            </div>

            {walletState.isLoading && (
                <LoadingOverlay message="Loading wallets..." />
            )}
        </div>
    );
}

export default DefiView;