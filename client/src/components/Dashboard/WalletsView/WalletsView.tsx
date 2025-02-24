import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ValueCard from "./ValueCard";
import AssetBreakdown from "./TokenBreakdown";
import { components } from "../../../types/api-types";
import { Pencil, RefreshCcw } from "lucide-react";
import "./WalletsView.css";
import { ViewType } from "../ViewSelector";
import { calculate24hChange } from "../../../utils/calc";
import LoadingOverlay from "../../Default/LoadingOverlay";
import { FetchState, ENDPOINTS } from "../../../utils/api";

type Wallet = components["schemas"]["UnifiedWallet"];

interface WalletsViewProps {
  walletState: FetchState<Wallet[]>;
  onViewChange: (view: ViewType) => void;
  forcedUpdate: () => void;
}

const WalletsView: React.FC<WalletsViewProps> = ({
  walletState: wallets,
  onViewChange,
  forcedUpdate
}) => {
  const [showNull, setShowNull] = useState<boolean>(wallets.isLoading)
  
  useEffect(() => {
    setShowNull(wallets.isLoading || !!wallets.error);
  }, [wallets]);

  const navigate = useNavigate();

  const getLastUpdated = () => {
    const cached = localStorage.getItem(ENDPOINTS.WALLETS.endpoint);
    if (cached) {
      const { timestamp } = JSON.parse(cached);
      return timestamp;
    }
    return 0;
  };

  const onViewAsset = (assetId: string) => {
    navigate(`/Dashboard/asset/${assetId}`);
  };

  const onViewWallet = (address: string) => {
    navigate(`wallet/${address}`);
  };

  // Only calculate totals if we have wallet data
  const totalWalletValue = !showNull ? wallets.data!.reduce(
    (sum, wallet) => sum + wallet.total_value_usd,
    0
  ) : 0;

  const total24hChange = !showNull ? calculate24hChange(wallets.data!) : 0;

  const totalDefiValue = !showNull ? wallets.data!.reduce(
    (sum, wallet) => sum + (wallet.total_value_defi || 0),
    0
  ) : 0;

  const sortedWallets = !showNull ? wallets.data!.sort((a, b) => (b.total_value_usd) - (a.total_value_usd)) : [];

  return (
    <div>
      <section className="dashboard-head">
        <div className="overview-values">
          <ValueCard
            label="Total"
            value={Math.round(totalWalletValue)}
            color="#000100"
          />
          <ValueCard
            label="DeFi Total"
            value={Math.round(totalDefiValue)}
            color="black"
          />
          <ValueCard
            label="24h Change"
            value={total24hChange}
            color="black"
            isPercent={true}
          />
          <ValueCard
            label="Wallets"
            value={wallets.data ? wallets.data.length : 0}
            color="black"
            isText={true}
          />
          <ValueCard
            label="Last Updated"
            value={Math.round((new Date().getTime() - new Date(getLastUpdated()).getTime()) / 60000) + " min"}
            color="black"
            isText={true}
          />
        </div>
        <div className="overview-edit">
          <button onClick={() => onViewChange("Manage" as ViewType)}>
            <Pencil />
          </button>
          <button onClick={() => forcedUpdate()}>
            <RefreshCcw />
          </button>
        </div>
      </section>

      {!showNull && wallets.data ? (
        <section className="dashboard-sub-cat">
          {sortedWallets!.map((wallet) => (
            <AssetBreakdown
              key={wallet.address}
              name={wallet.name}
              color={wallet.color}
              address={wallet.address!}
              tokens={wallet.tokens}
              totalDefiValue={Math.round(wallet.total_value_defi || 0)}
              totalValue={Math.round(wallet.total_value_assets || 0)}
              onViewWallet={onViewWallet}
              onViewAsset={onViewAsset}
            />
          ))}
        </section>
      ) : (
        <div>
          {wallets.isLoading ?
            <LoadingOverlay message="Loading wallets..." /> :
            <div className="modal-overlay">
              <div className="modal">
                <div className="modal-content error">
                  <div className="error-icon">✕</div>
                  <p>{`Error fetching wallets: ${wallets.error || "Internal Server Error"}`}</p>
                </div>
              </div>
            </div>
          }
        </div>
      )}
    </div>
  );
};

export default WalletsView;