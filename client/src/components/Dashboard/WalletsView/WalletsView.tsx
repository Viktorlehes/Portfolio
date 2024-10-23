import React from "react";
import ValueCard from "./ValueCard";
import AssetBreakdown from "./AssetBreakdown";
import { components } from "../../../types/api-types";
import { Pencil } from "lucide-react";
import TokenPieChartBreakdown from "./tokenPieChartBreakdown";
import "./WalletsView.css";

type Wallet = components["schemas"]["Wallet"];

interface WalletsViewProps {
  wallets: Wallet[];
}

const WalletsView: React.FC<WalletsViewProps> = ({ wallets }) => {
  const totalWalletValue = wallets.reduce(
    (total, wallet) =>
      total + wallet.tokens.reduce((sum, token) => sum + token.value, 0),
    0
  );

  return (
    <div>
      <section className="dashboard-head">
        <div className="overview-values">
          <ValueCard label={"Total"} value={totalWalletValue} color="#000100" />
          {wallets.map((wallet) => (
            <ValueCard
              key={wallet.address}
              label={wallet.name}
              value={wallet.tokens.reduce((sum, token) => sum + token.value, 0)}
              color={wallet.color}
            />
          ))}
        </div>
        
        <div className="overview-edit">
        <TokenPieChartBreakdown wallets={wallets}/>
          <button onClick={() => (window.location.href = "/Dashboard/manage")}>
            <Pencil />
          </button>
        </div>
      </section>

      <section className="dashboard-sub-cat">
        {wallets.map((wallet) => (
          <AssetBreakdown
            key={wallet.address}
            name={wallet.name}
            color={wallet.color}
            tokens={wallet.tokens}
          />
        ))}
      </section>
    </div>
  );
};

export default WalletsView;
