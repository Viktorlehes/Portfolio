import React, { useEffect, useState } from "react";
import { useLocation, useLoaderData, Outlet, LoaderFunction } from "react-router-dom";
import { ViewType } from "../../components/Dashboard/ViewSelector";
import { components } from "../../types/api-types";
import Viewselector from "../../components/Dashboard/ViewSelector";
import WalletsView from "../../components/Dashboard/WalletsView/WalletsView"
import AssetsView from '../../components/Dashboard/AssetsView/AssetsView'
import ManageWallets from "./ManageWallets";
import { api, ENDPOINTS, useDataFetching } from "../../utils/api";
import "./Dashboard.css";

type Wallet = components["schemas"]["UnifiedWallet"];

interface WalletUpdateData {
  address: string
  name: string;
  color: string;
  risk_level: string;
}

export const dashboardLoader: LoaderFunction = () => {
  const savedView = localStorage.getItem('dashboardView');
  const defaultView = 'Wallets' as ViewType;
  const currentView = savedView ? JSON.parse(savedView) as ViewType : defaultView;
  
  return {
    currentView,
  };
};

const Dashboard: React.FC = () => {
  const initialView = useLoaderData() as ViewType;
  const [currentView, setCurrentView] = useState<ViewType>(initialView);
  const location = useLocation();

  const walletState = useDataFetching<Wallet[]>({
    ...ENDPOINTS.WALLETS,
  });

  useEffect(() => {
    const savedView = localStorage.getItem('dashboardView');
    if (savedView) {
      setCurrentView(JSON.parse(savedView));
    } else {
      setCurrentView("Wallets")
    }
  })

  const handleViewChange = (newView: ViewType) => {
    setCurrentView(newView);
    localStorage.setItem('dashboardView', JSON.stringify(newView));
  };

  const forcedWalletUpdate = async () => {
    await walletState.refetch();
  };

  const handleDeleteWallet = async (address: string) => {
    try {
      const response = await api.delete<boolean>(`/wallet/${address}`);

      if (!response.success || response.error) {
        return {success: false, error: response.error|| "Something went wrong"}
      }

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

  const handleAddWallet = async (address: string, name: string, color: string, risk_level: string) => {
    if (walletState.data?.some(wallet => wallet.address === address)) {
      return { success: false, error: 'Wallet already exists' };
    }

    try {
      const response = await api.post<Wallet, WalletUpdateData>(
        `/wallet/`,
        { name, address, color, risk_level }
      );

      if (!response.success || response.error) {
        return { success: false, error: response.error || "Something went wrong"};
      }

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

  const colorOptions = [
    { label: 'Safe', color: '#22c55e' },
    { label: 'Normal', color: '#f97316' },
    { label: 'Risky', color: '#ef4444' }
  ];

  const handleEditWallet = async (wallet: Wallet) => {
    const risk_level = colorOptions.find(option => option.color === wallet.color)?.label ?? "Normal";
    const updateData: WalletUpdateData = {
      address: wallet.address!,
      color: wallet.color,
      risk_level: risk_level,
      name: wallet.name
    };

    try {
      const response = await api.post<boolean, WalletUpdateData>(`/wallet/update`, updateData);

      if (!response.success || response.error) {
        return {success: false, error: response.error || "Something went wrong"}
      }

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

  const renderView = () => {
    if (location.pathname.includes('/wallet') || location.pathname.includes('/asset')) {
      return <Outlet />;
    }
    switch (currentView) {
      case 'Wallets':
        return (
          <WalletsView
            walletState={walletState}
            onViewChange={handleViewChange}
            forcedUpdate={forcedWalletUpdate}
          />
        );
      case 'Assets':
        return (
          <AssetsView 
            wallets={walletState.data|| []} 
            isNull={walletState.isLoading || !!walletState.error} 
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
            walletState={walletState}
            onViewChange={handleViewChange}
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