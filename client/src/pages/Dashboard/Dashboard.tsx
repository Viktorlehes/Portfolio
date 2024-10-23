// src/pages/Dashboard.tsx
import React from "react";
//import { useState } from "react";
import { useLoaderData, LoaderFunction } from "react-router-dom";
import { ViewType } from "../../components/Dashboard/ViewSelector";
import { components } from "../../types/api-types";
import CustomNavbar from "../../components/Default/CustomNavBar";
import Viewselector from "../../components/Dashboard/ViewSelector";
import WalletsView from "../../components/Dashboard/WalletsView/WalletsView"
import AssetsView from '../../components/Dashboard/AssetsView/AssetsView'
import "./Dashboard.css";

type Wallet = components["schemas"]["Wallet"];

async function getWallet(walletAddress: string): Promise<Wallet> {
  try {
    const response = await fetch(`http://127.0.0.1:8000/dashboard/wallet/${walletAddress}`); // Adjust the URL to match your FastAPI endpoint
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.statusText}`);
    }

    const data: Wallet = await response.json();

    return data;
  } catch (error) {
    console.error('Error fetching crypto stats:', error);
    throw new Error('Could not load crypto stats');
  }
}
 
export const dashboardLoader: LoaderFunction = async () => {
  const savedView = localStorage.getItem('dashboardView') || 'Wallets';
  let filledWalletAddresses: Wallet[] = localStorage.getItem('wallets') ? JSON.parse(localStorage.getItem('wallets') as string) : [];

  if (filledWalletAddresses.length > 0) {
    return { currentView: savedView, wallets: filledWalletAddresses };
  }

  const walletAddresses: string[] = ['0x1234', '0x1134'];

  for (const address of walletAddresses) {
    const walletData:Wallet = await getWallet(address);

    filledWalletAddresses.push({
      address: walletData["address"],
      tokens: walletData["tokens"],
      name: walletData["name"],
      color: walletData["color"]
    });
  }

  localStorage.setItem('wallets', JSON.stringify(filledWalletAddresses));

  return { currentView: savedView, wallets: filledWalletAddresses };
};

const Dashboard: React.FC = () => {
  const { currentView, wallets } = useLoaderData() as { currentView: ViewType; wallets: Wallet[] };
  const [localView, setLocalView] = React.useState<ViewType>(currentView);

  const handleViewChange = (newView: ViewType) => {
    setLocalView(newView);
    localStorage.setItem('dashboardView', newView);
  };

  const renderView = () => {
    switch (localView) {
      case 'Wallets':
        return <WalletsView wallets={wallets}/>;
      case 'Assets':
        return <AssetsView wallets={wallets} />;
      default:
        return null;
    }
  };

  return (
    <div className="default-page">
      <div className="page-header">
        <div className="custom-headers">
          <h1>Wealth Dashboard</h1>
          <Viewselector currentView={localView} onViewChange={handleViewChange} />
        </div>
        <CustomNavbar />
      </div>
      <div className="page-content">
        {renderView()}
      </div>
    </div>
  );
};

export default Dashboard;