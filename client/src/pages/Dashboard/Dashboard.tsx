import React, { useState } from "react";
import { useLocation, useLoaderData, Outlet, LoaderFunction } from "react-router-dom";
import { ViewType } from "../../components/Dashboard/ViewSelector";
import { components } from "../../types/api-types";
import Viewselector from "../../components/Dashboard/ViewSelector";
import WalletsView from "../../components/Dashboard/WalletsView/WalletsView"
import AssetsView from '../../components/Dashboard/AssetsView/AssetsView'
import ManageWallets from "./ManageWallets";
import { api, ENDPOINTS, useDataFetching } from "../../utils/api";
import "./Dashboard.css";

type Wallet = components["schemas"]["Wallet"];

interface LoaderData {
  currentView: ViewType;
  wallets: {
    data: Wallet[] | null;
    timestamp: number;
  }
}

interface WalletUpdateData {
  name: string;
  color: string;
  mode: string;
}

export const dashboardLoader: LoaderFunction = () => {
  const savedView = localStorage.getItem('dashboardView');
  const defaultView = 'Wallets' as ViewType;
  const currentView = savedView ? JSON.parse(savedView) as ViewType : defaultView;

  const cachedWallets = localStorage.getItem(ENDPOINTS.WALLETS.endpoint);
  
  return {
    currentView,
    wallets: cachedWallets ? JSON.parse(cachedWallets) : {
      data: null,
      timestamp: 0
    }
  };
};

const Dashboard: React.FC = () => {
  const { currentView: initialView, wallets: cachedWallets } = useLoaderData() as LoaderData;
  const [currentView, setCurrentView] = useState<ViewType>(initialView);
  const location = useLocation();

  const walletState = useDataFetching<Wallet[]>({
    ...ENDPOINTS.WALLETS,
    initialData: cachedWallets
  });

  const handleViewChange = (newView: ViewType) => {
    setCurrentView(newView);
    localStorage.setItem('dashboardView', JSON.stringify(newView));
  };

  const forcedWalletUpdate = async () => {
    await walletState.refetch();
  };

  const handleDeleteWallet = async (address: string) => {
    try {
      await api.delete(`/wallets/manage/delete_wallet/${address}`);

      await forcedWalletUpdate();
      return { success: true };
    } catch (error) {
      console.error('Error deleting wallet:', error);
      if ((error as any)?.response?.status === 404) {
        return { success: false, error: 'Wallet not found' };
      }
      return { success: false, error: 'Failed to delete wallet' };
    }
  };

  const handleAddWallet = async (address: string, name: string, color: string, walletType: string) => {
    if (walletState.data?.some(wallet => wallet.address === address)) {
      return { success: false, error: 'Wallet already exists' };
    }

    try {
      await api.post(
        `/wallets/manage/new_wallet/${address}`,
        { name, color, mode: walletType }
      );

      await forcedWalletUpdate();
      return { success: true };
    } catch (error) {
      console.error('Error adding wallet:', error);
      if (error instanceof Error) {
        if (error.message.includes('500')) {
          return { success: false, error: 'Server error: Unable to process your request' };
        }
        if (error.message.includes('400')) {
          return { success: false, error: 'Invalid Wallet' };
        }
      }
      return { success: false, error: 'Network error: Unable to connect to server' };
    }
  };

  const handleEditWallet = async (wallet: Wallet) => {
    const updateData: WalletUpdateData = {
      name: wallet.name,
      color: wallet.color,
      mode: wallet.wallet_mode
    };

    try {
      await api.put(
        `/wallets/manage/update_wallet/${wallet.address}`,
        updateData
      );

      await forcedWalletUpdate();
      return { success: true };
    } catch (error) {
      console.error('Error updating wallet:', error);
      return {
        success: false,
        error: 'Network error: Unable to connect to server'
      };
    }
  };

  const getLastUpdated = () => {
    const cached = localStorage.getItem(ENDPOINTS.WALLETS.endpoint);
    if (cached) {
      const { timestamp } = JSON.parse(cached);
      return timestamp;
    }
    return Date.now();
  };

  const renderView = () => {
    if (location.pathname.includes('/wallet') || location.pathname.includes('/asset')) {
      return <Outlet />;
    }

    const lastUpdated = getLastUpdated();

    switch (currentView) {
      case 'Wallets':
        return (
          <WalletsView
            wallets={walletState.data || []}
            onViewChange={handleViewChange}
            isNull={walletState.isLoading}
            lastUpdated={ lastUpdated }
            forcedUpdate={forcedWalletUpdate}
          />
        );
      case 'Assets':
        return (
          <AssetsView 
            wallets={walletState.data|| []} 
            isNull={walletState.isLoading} 
          />
        );
      case 'Manage':
        return (
          <ManageWallets
            wallets={walletState.data || []}
            onViewChange={handleViewChange}
            onDeleteWallet={handleDeleteWallet}
            onAddWallet={handleAddWallet}
            onEditWallet={handleEditWallet}
          />
        );
      default:
        return (
          <WalletsView
            wallets={walletState.data || []}
            onViewChange={handleViewChange}
            isNull={walletState.isLoading}
            lastUpdated={lastUpdated}
            forcedUpdate={forcedWalletUpdate}
          />
        );
    }
  };

  return (
    <div className="default-page">
      <div className="page-header">
        <div className="custom-headers">
          <h1>Wealth Dashboard</h1>
          {!location.pathname.includes('/wallet') && 
           !location.pathname.includes('/asset') && (
            <Viewselector 
              currentView={currentView} 
              onViewChange={handleViewChange} 
            />
          )}
        </div>
      </div>
      <div className="page-content">
        {renderView()}
      </div>
    </div>
  );
};

export default Dashboard;