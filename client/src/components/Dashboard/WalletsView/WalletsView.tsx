import React from "react";
import { useNavigate } from "react-router-dom";
import ValueCard from "./ValueCard";
import AssetBreakdown from "./TokenBreakdown";
import { components } from "../../../types/api-types";
import { Pencil, RefreshCcw } from "lucide-react";
import "./WalletsView.css";
import { ViewType } from "../ViewSelector";
import { calculate24hChange } from "../../../utils/calc";
import LoadingOverlay from "../../Default/LoadingOverlay";

type Wallet = components["schemas"]["Wallet"];

interface WalletsViewProps {
  wallets: Wallet[];
  onViewChange: (view: ViewType) => void;
  isNull: boolean;
  lastUpdated: number;
  forcedUpdate: () => void;
}

const WalletsView: React.FC<WalletsViewProps> = ({
  wallets,
  onViewChange,
  isNull,
  lastUpdated,
  forcedUpdate
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
  const totalWalletValue = !isNull ? wallets.reduce(
    (sum, wallet) => sum + wallet.asset_total,
    0
  ) : 0;

  const total24hChange = !isNull ? calculate24hChange(wallets) : 0;

  const totalDefiValue = !isNull ? wallets.reduce(
    (sum, wallet) => sum + wallet.defi_total,
    0
  ) : 0;

  const sortedWallets = !isNull ? wallets.sort((a, b) => (b.asset_total + b.defi_total) - (a.asset_total + a.defi_total)) : [];

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
          <button onClick={() => forcedUpdate()}>
            <RefreshCcw />
          </button>
        </div>
      </section>

      {isNull ? (
        <LoadingOverlay message="Loading wallets..." />
      ) : (
        <section className="dashboard-sub-cat">
          {sortedWallets!.map((wallet) => (
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