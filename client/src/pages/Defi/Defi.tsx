import React, { useState, useEffect } from "react";
import CustomNavbar from "../../components/Default/CustomNavBar";
import { components } from "../../types/api-types";
import { useLoaderData, LoaderFunction } from "react-router-dom";
import ValueCard from "../../components/Dashboard/WalletsView/ValueCard";
import "./Defi.css";
import DefiPositions from "../../components/Dashboard/WalletView/DefiPositions";
import { getCachedData, isDataExpired } from "../../utils/api";
import LoadingOverlay from "../../components/Default/LoadingOverlay";
import { api } from "../../utils/api";

type Wallet = components["schemas"]["Wallet"];
type DefiPosition = components["schemas"]["DefiPosition"];

export interface ExtendedDefiPosition extends DefiPosition {
    walletAddress: string;
    walletName: string;
}

interface CachedData<T> {
    data: T;
    timestamp: number;
}

const CACHE_KEYS = {
    WALLETS: 'wallets',
} as const;

const API_ENDPOINTS = {
    WALLETS: '/wallets/get_wallets',
} as const;

interface LoaderData {
    wallets: CachedData<Wallet[]>;
}

export const defiLoader: LoaderFunction = async () => {
    const cachedWallets = getCachedData(CACHE_KEYS.WALLETS) as CachedData<Wallet[]>;

    return {
        wallets: cachedWallets || { data: [], timestamp: null },
    }
};

const DefiView: React.FC = () => {
    const { wallets } = useLoaderData() as LoaderData
    const [localWallets, setLocalWallets] = useState<CachedData<Wallet[]> | null>(wallets ? wallets : null);
    const [loadingStates, setLoadingStates] = useState({
        wallets: !wallets.data
    });
    const [showSmallValues, setShowSmallValues] = React.useState(false);

    //TODO: Add routing to wallet view
    //const location = useLocation();

    useEffect(() => {
        const updateWalletData = async () => {
            if (isDataExpired(localWallets ? localWallets.timestamp : 0)) {
                if (!localWallets) {
                    setLoadingStates(prev => ({ ...prev, wallets: true }));
                }
                try {
                    const data = await api.get(API_ENDPOINTS.WALLETS);
                    const newWallets: Wallet[] = await data.json();
                    localStorage.setItem(CACHE_KEYS.WALLETS, JSON.stringify({
                        data: newWallets,
                        timestamp: Date.now()
                    }));
                    setLocalWallets({data: newWallets, timestamp: Date.now()});
                } catch (error) {
                    console.error('Error updating wallets:', error);
                } finally {
                    setLoadingStates(prev => ({ ...prev, wallets: false }));
                }
            }
        };
        updateWalletData();
        const intervalId = setInterval(updateWalletData, 60000);
        return () => clearInterval(intervalId);
    }, [localWallets]);

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


    const total24hChange = localWallets ? calculate24hChange(localWallets.data) : 0; 
    const totalDefiValue = localWallets ? localWallets.data.reduce(
        (sum, wallet) => sum + wallet.defi_total,
        0
    ) : 0;

    const defiPositions: ExtendedDefiPosition[] = localWallets ? localWallets.data.reduce((acc, wallet) => {
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

            {loadingStates.wallets && (
                <LoadingOverlay message="Loading wallets..." />
            )}
        </div>
    );
}

export default DefiView;