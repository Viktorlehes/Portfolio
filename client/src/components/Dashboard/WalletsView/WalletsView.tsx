import React from "react";
import { useNavigate } from "react-router-dom";
import ValueCard from "./ValueCard";
import AssetBreakdown from "./TokenBreakdown";
import { components } from "../../../types/api-types";
import { Pencil, RefreshCcw } from "lucide-react";
import "./WalletsView.css";
import { ViewType } from "../ViewSelector";

type Wallet = components["schemas"]["Wallet"];
type FullToken = components["schemas"]["FullToken"];
type DefiPosition = components["schemas"]["DefiPosition"];

interface WalletsViewProps {
  wallets: Wallet[];
  onViewChange: (view: ViewType) => void;
  refreshWallets: () => void;
}

const WalletsView: React.FC<WalletsViewProps> = ({ wallets, onViewChange, refreshWallets }) => {
  const navigate = useNavigate();
  const totalWalletValue = wallets.reduce(
    (sum, wallet) => sum + wallet.asset_total,
    0
  );

  const onViewWallet = (address: string) => {
    navigate(`wallet/${address}`);
  };

  const calculate24hChange = (items: (FullToken | DefiPosition)[]) => {
    return items.reduce((acc, item) => {
        const change = item.hasOwnProperty('token_data')
            ? (item as FullToken).token_data?.change24h || 0
            : (item as DefiPosition).changes.percent_1d || 0;
        return acc + change;
    }, 0);  
  };

  const total24hChange = wallets.reduce((acc, wallet) => {return acc + calculate24hChange(wallet.tokens || []) + calculate24hChange(wallet.defi_positions || []);}, 0);

  const totalDefiValue = wallets.reduce(
    (sum, wallet) => sum + wallet.defi_total,
    0
  );
  return (
    <div>
      <section className="dashboard-head">
        <div className="overview-values">
          <ValueCard label={"Total"} value={totalWalletValue} color="#000100" />
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
            key={"numWallets"}
            label={"Wallets"}
            value={wallets.length}
            color={'black'}
            isText={true}
          />
        </div>
        <div className="overview-edit">
          <button onClick={() => onViewChange("Manage" as ViewType)}>
            <Pencil />
          </button>
          <button onClick={refreshWallets}>
            <RefreshCcw />
          </button>
        </div>
      </section>
      <section className="dashboard-sub-cat">
        {wallets.map((wallet) => (
            <AssetBreakdown
              key={wallet.address}
              name={wallet.name}
              color={wallet.color}
              address={wallet.address}
              tokens={wallet.tokens || []}
              totalDefiValue={wallet.defi_total}
              totalValue={wallet.asset_total}
              change24h={calculate24hChange(wallet.tokens || []) + calculate24hChange(wallet.defi_positions || [])}
              onViewWallet={onViewWallet}
            />
        ))}
      </section>
    </div>
  );
};

export default WalletsView;