import React from "react";
import NewConnection from "../../components/Dashboard/WalletsView/NewConnection";
import ManageWalletsList from "../../components/Dashboard/WalletsView/ManageWalletsList";
import { ArrowLeftFromLine } from "lucide-react";
import { components } from "../../types/api-types";
import { ViewType } from "../../components/Dashboard/ViewSelector";
import "./ManageWallets.css";

type Wallet = components["schemas"]["Wallet"];

interface ManageWalletsProps {
  wallets: Wallet[];
  onViewChange: (view: ViewType) => void;
  onDeleteWallet: (address: string) => void;
  onAddWallet: (address: string, name: string, color: string, walletType: string) => Promise<{ success: boolean; error?: string }>;
  onEditWallet: (wallet: Wallet) => Promise<{ success: boolean; error?: string }>;
}

const ManageWallets: React.FC<ManageWalletsProps> = ({
  wallets,
  onViewChange,
  onDeleteWallet,
  onAddWallet,
  onEditWallet
}) => {
  return (
    <div className="content-wrapper">
      <div className="Managewallet-return">
        <button onClick={() => onViewChange("Wallets" as ViewType)}>
          <ArrowLeftFromLine />
        </button>
      </div>
      <div>
        <ManageWalletsList 
          wallets={wallets}
          onDeleteWallet={onDeleteWallet}
          onEditWallet={onEditWallet}
        />
      </div>
      <div className="manage-wallets-wrapper">
        <NewConnection onAddWallet={onAddWallet} />
      </div>
    </div>
  );
};

export default ManageWallets;