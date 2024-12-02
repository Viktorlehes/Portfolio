import React from "react";
import { useNavigate } from "react-router-dom";
import ValueCard from "./ValueCard";
import AssetBreakdown from "./TokenBreakdown";
import { components } from "../../../types/api-types";
import { Pencil } from "lucide-react";
import "./WalletsView.css";
import { ViewType } from "../ViewSelector";
import { calculate24hChange } from "../../../utils/calc";
import LoadingOverlay from "../../Default/LoadingOverlay";

type Wallet = components["schemas"]["Wallet"];

interface WalletsViewProps {
  wallets: Wallet[] | null;
  onViewChange: (view: ViewType) => void;
  isLoading: boolean;
  lastUpdated: number;
}

const WalletsView: React.FC<WalletsViewProps> = ({ 
  wallets, 
  onViewChange, 
  isLoading,
  lastUpdated
}) => {
  const navigate = useNavigate();

  const onViewAsset = (assetId: string, assetName: string, isFungible: boolean) => {
    const searchParams = new URLSearchParams({
      name: assetName,
      fungible: isFungible.toString(),
    });
    navigate(`/Dashboard/asset/${assetId}?${searchParams.toString()}`);
  };

  const onViewWallet = (address: string) => {
    navigate(`wallet/${address}`);
  };

  // Only calculate totals if we have wallet data
  const totalWalletValue = wallets ? wallets.reduce(
    (sum, wallet) => sum + wallet.asset_total,
    0
  ) : 0;

  const total24hChange = wallets ? calculate24hChange(wallets) : 0;

  const totalDefiValue = wallets ? wallets.reduce(
    (sum, wallet) => sum + wallet.defi_total,
    0
  ) : 0;

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
            value={Math.round(total24hChange)}
            color="black"
            isPercent={true}
          />
          <ValueCard
            label="Wallets"
            value={wallets ? wallets.length : 0}
            color="black"
            isText={true}
          />
          <ValueCard
            label="Last Updated"
            value={Math.round((new Date().getTime() - new Date(lastUpdated).getTime()) / 60000) + " min"}
            color="black"
            isText={true}
          />
        </div>
        <div className="overview-edit">
          <button onClick={() => onViewChange("Manage" as ViewType)}>
            <Pencil />
          </button>
        </div>
      </section>

      {isLoading && !wallets ? (
        <LoadingOverlay message="Loading wallets..." />
      ) : (
        <section className="dashboard-sub-cat">
          {wallets!.map((wallet) => (
            <AssetBreakdown
              key={wallet.address}
              name={wallet.name}
              color={wallet.color}
              address={wallet.address}
              tokens={wallet.tokens || []}
              totalDefiValue={Math.round(wallet.defi_total)}
              totalValue={Math.round(wallet.asset_total)}
              onViewWallet={onViewWallet}
              onViewAsset={onViewAsset}
            />
          ))}
        </section>
      )}
    </div>
  );
};

export default WalletsView;