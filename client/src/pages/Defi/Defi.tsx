import React from "react";
import { useDataFetching, ENDPOINTS } from "../../utils/api";
import CustomNavbar from "../../components/Default/CustomNavBar";
import { components } from "../../types/api-types";
import ValueCard from "../../components/Dashboard/WalletsView/ValueCard";
import "./Defi.css";
import DefiPositions from "../../components/Dashboard/WalletView/DefiPositions";
import LoadingOverlay from "../../components/Default/LoadingOverlay";

type Wallet = components["schemas"]["Wallet"];
type DefiPosition = components["schemas"]["DefiPosition"];

export interface ExtendedDefiPosition extends DefiPosition {
    walletAddress: string;
    walletName: string;
}

const DefiView: React.FC = () => {
    const walletState = useDataFetching<Wallet[]>(ENDPOINTS.WALLETS);
    const [showSmallValues, setShowSmallValues] = React.useState(false);

    //TODO: Add routing to wallet view
    //const location = useLocation();

    const calculate24hChange = (wallets: Wallet[]) => {
        const allPositions = wallets.reduce((acc, wallet) => {
            const defiPositions = (wallet.defi_positions || []).map(position => ({
                ...position,
                walletAddress: wallet.address,
                walletName: wallet.name
            }));
            return [...acc, ...defiPositions];
        }, [] as ExtendedDefiPosition[]);

        const totalValue = allPositions.reduce((acc, item) => {
            return acc + item.value;
        }, 0);

        const totalChange = allPositions.reduce((acc, item) => {
            return acc + (item.changes.absolute_1d || 0);
        }, 0);

        return totalValue > 0 ? (totalChange / totalValue) * 100 : 0;
    };


    const total24hChange = walletState.data ? calculate24hChange(walletState.data) : 0; 
    const totalDefiValue = walletState.data ? walletState.data.reduce(
        (sum, wallet) => sum + wallet.defi_total,
        0
    ) : 0;

    const defiPositions: ExtendedDefiPosition[] = walletState.data ? walletState.data.reduce((acc, wallet) => {
        const defiPositions = (wallet.defi_positions || []).map(position => ({
            ...position,
            walletAddress: wallet.address,
            walletName: wallet.name
        }));
        return [...acc, ...defiPositions];
    }, [] as ExtendedDefiPosition[]) : [];

    const filteredDefiPositions = defiPositions.filter(position =>
        showSmallValues || position.value >= 1);

    return (
        <div className="default-page">
            <div className="page-header">
                <div className="custom-headers">
                    <h1>DeFi</h1>
                </div>
                <CustomNavbar />
            </div>
            <div className="page-content">
                <section className="defi-head">
                    <div className="defi-head-values">
                        <ValueCard
                            key={"defiTotal"}
                            label={"DeFi Total"}
                            value={totalDefiValue}
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