import React from "react";
import CustomNavbar from "../../components/Default/CustomNavBar";
import NewConnection from "../../components/Dashboard/WalletsView/NewConnection";
import ManageWalletsList from "../../components/Dashboard/WalletsView/ManageWalletsList";
import { ArrowLeftFromLine } from "lucide-react";
import "./ManageWallets.css";

const ManageWallets: React.FC = () => {
  return (
    <div className="default-page">
      <div className="page-header">
        <h1>Wealth Dashboard</h1>
        <CustomNavbar />
      </div>
      <div className="page-content">
        <div className="content-wrapper">
          <div className="Managewallet-return">
            <button
              onClick={() => (window.location.href = "/Dashboard")}
            >
              <ArrowLeftFromLine />
            </button>
          </div>

          <div>
            <ManageWalletsList />
          </div>

          <div className="manage-wallets-wrapper">
            <NewConnection />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageWallets;
