import React from "react";
import { useLocation, useLoaderData, Outlet, LoaderFunction } from "react-router-dom";
import { ViewType } from "../../components/Dashboard/ViewSelector";
import { components } from "../../types/api-types";
import CustomNavbar from "../../components/Default/CustomNavBar";
import Viewselector from "../../components/Dashboard/ViewSelector";
import WalletsView from "../../components/Dashboard/WalletsView/WalletsView"
import AssetsView from '../../components/Dashboard/AssetsView/AssetsView'
import ManageWallets from "./ManageWallets";
import "./Dashboard.css";

type Wallet = components["schemas"]["Wallet"];

async function getWallets(): Promise<Wallet[]> {
  try {
    const response = await fetch('http://127.0.0.1:8000/dashboard/wallets');
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.statusText}`);
    }

    const responseData = await response.json();

    return responseData;
  } catch (error) {
    console.error('Error fetching crypto stats:', error);
    throw new Error('Could not load crypto wallets');
  }
}
 
export const dashboardLoader: LoaderFunction = async () => {
  const savedView = localStorage.getItem('dashboardView') || 'Wallets';
  let filledWalletAddresses: Wallet[] = localStorage.getItem('wallets') ? JSON.parse(localStorage.getItem('wallets') as string) : [];

  if (filledWalletAddresses.length > 0) {
    return { currentView: savedView, wallets: filledWalletAddresses };
  }

  filledWalletAddresses = await getWallets();
  
  localStorage.setItem('wallets', JSON.stringify(filledWalletAddresses));

  return { currentView: savedView, wallets: filledWalletAddresses };
}

const Dashboard: React.FC = () => {
  const { currentView, wallets } = useLoaderData() as { currentView: ViewType; wallets: Wallet[] };
  const [localView, setLocalView] = React.useState<ViewType>(currentView);
  const [localWallets, setLocalWallets] = React.useState<Wallet[]>(wallets);
  const location = useLocation();


  const handleViewChange = (newView: ViewType) => {
    setLocalView(newView);
    localStorage.setItem('dashboardView', newView);
  };

  const isWalletDetail = location.pathname.includes('/wallet/');

  const handleDeleteWallet = async (address: string) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/dashboard/manage/delete_wallet/${address}`, {
        method: 'DELETE',
      });
      
      if (response.status !== 204) {
        throw new Error('Failed to delete wallet');
      }

      // Filter out the deleted wallet to create a new state array
      const updatedWallets = localWallets.filter(wallet => wallet.address !== address);

      // Update the state and localStorage in sync
      setLocalWallets(updatedWallets);
      localStorage.setItem('wallets', JSON.stringify(updatedWallets));

      console.log('Updated Wallets:', updatedWallets);
    } catch (error) {
      console.error('Error deleting wallet:', error);
    }
  };

  const handleAddWallet = async (address: string, name: string, color: string, walletType: string) => {
    
    const walletExists = localWallets.some(wallet => wallet.address === address);

    console.log('Adding wallet:', address, name, color, walletType);
    

    if (walletExists) {
      return { success: false, error: 'Wallet already exists' };
    }
    
    try {
      const response = await fetch(`http://127.0.0.1:8000/dashboard/manage/new_wallet/${address}`, {
        method: 'POST',
        body: JSON.stringify({ name, color, mode: walletType }),  // renamed walletType to mode
        headers: {
            'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const newWallet = await response.json() as Wallet;

        // Update the state and localStorage with the new wallet
        setLocalWallets(prevWallets => {
          const updatedWallets = [...prevWallets, newWallet];
          localStorage.setItem('wallets', JSON.stringify(updatedWallets));
          return updatedWallets;
        });

        return { success: true };
      } else if (response.status === 500) {
        return { success: false, error: 'Server error: Unable to process your request' };
      } else {
        return { success: false, error: 'An unexpected error occurred' };
      }
    } catch (error) {
      return { success: false, error: 'Network error: Unable to connect to server' };
    }
  };

  const handleEditWallet = async (updatedWallet: Wallet) => {
    console.log('Editing wallet:', updatedWallet);
  };

  const refreshWallets = async () => {
    try {
      const updatedWallets = await getWallets();
      setLocalWallets(updatedWallets);
      localStorage.setItem('wallets', JSON.stringify(updatedWallets));
      window.location.reload();
    } catch (error) {
      console.error('Error refreshing wallets:', error);
    }
  }

  const renderView = () => {

    if (isWalletDetail) {
      return <Outlet />;
    }

    switch (localView) {
      case 'Wallets':
        return <WalletsView wallets={localWallets} onViewChange={handleViewChange} refreshWallets={refreshWallets}/>;
      case 'Assets':
        return <AssetsView wallets={localWallets}  />;
      case 'Manage':
        return (
          <ManageWallets 
            wallets={localWallets}
            onViewChange={handleViewChange}
            onDeleteWallet={handleDeleteWallet}
            onAddWallet={handleAddWallet}
            onEditWallet={handleEditWallet}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="default-page">
      <div className="page-header">
        <div className="custom-headers">
          <h1>Wealth Dashboard</h1>
          {!isWalletDetail && (
            <Viewselector currentView={localView} onViewChange={handleViewChange} />
          )}
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