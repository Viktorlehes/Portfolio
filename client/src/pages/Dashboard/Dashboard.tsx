import React, { useState, useEffect } from "react";
import { useLocation, useLoaderData, Outlet, LoaderFunction } from "react-router-dom";
import { ViewType } from "../../components/Dashboard/ViewSelector";
import { components } from "../../types/api-types";
import CustomNavbar from "../../components/Default/CustomNavBar";
import Viewselector from "../../components/Dashboard/ViewSelector";
import WalletsView from "../../components/Dashboard/WalletsView/WalletsView"
import AssetsView from '../../components/Dashboard/AssetsView/AssetsView'
import ManageWallets from "./ManageWallets";
import { isDataExpired, getCachedData } from "../../utils/api";
import { api } from "../../utils/api";
import "./Dashboard.css";


type Wallet = components["schemas"]["Wallet"];

interface LoaderData {
  currentView: ViewType;
  wallets: CachedData<Wallet[]>;
}

interface WalletUpdateData {
  name: string;
  color: string;
  mode: string;
}

interface CachedData<T> {
  data: T;
  timestamp: number;
}

const CACHE_KEYS = {
  WALLETS: 'wallets',
  VIEW: 'dashboardView'
} as const;

const API_ENDPOINTS = {
  WALLETS: '/wallets/get_wallets',
} as const;

export const dashboardLoader: LoaderFunction = async () => {
  // Fix 1: Properly get and parse the saved view
  const savedView = localStorage.getItem(CACHE_KEYS.VIEW);
  const defaultView = 'Wallets' as ViewType;
  const currentView = savedView ? JSON.parse(savedView) as ViewType : defaultView;
  
  const cachedWallets = getCachedData(CACHE_KEYS.WALLETS) as CachedData<Wallet[]>;

  return {
    currentView,
    wallets: { 
      data: cachedWallets?.data || [], 
      timestamp: cachedWallets?.timestamp || null 
    } as CachedData<Wallet[]>,
  } as LoaderData;
}

const Dashboard: React.FC = () => {
  const cachedData = useLoaderData() as LoaderData;
  const [dashboardData, setDashboardData] = useState<LoaderData>(cachedData);
  const [loadingStates, setLoadingStates] = useState({
    wallets: !dashboardData.wallets
  });
  const location = useLocation();

  const updateExpiredData = async () => {
    const updates: Promise<void>[] = [];
    const newData = { ...dashboardData };
  
    if (loadingStates.wallets || isDataExpired(dashboardData.wallets.timestamp || 0)) {
      updates.push(
        api.get(API_ENDPOINTS.WALLETS)
          .then(wallets => {
            newData.wallets = {
              data: wallets,
              timestamp: Date.now()
            };
            localStorage.setItem(CACHE_KEYS.WALLETS, JSON.stringify(newData.wallets));
            setLoadingStates(prev => ({ ...prev, wallets: false }));
          })
          .catch(error => {
            console.error('Error fetching wallets:', error);
            setLoadingStates(prev => ({ ...prev, wallets: false }));
          })
      );
    }
  
    if (updates.length > 0) {
      try {
        await Promise.all(updates);
        setDashboardData(newData);
      } catch (error) {
        console.error('Error updating data:', error);
      }
    }
  };

  useEffect(() => {
    const savedView = localStorage.getItem(CACHE_KEYS.VIEW);
    if (savedView) {
      try {
        const parsedView = JSON.parse(savedView) as ViewType;
        setDashboardData(prev => ({
          ...prev,
          currentView: parsedView
        }));
      } catch (error) {
        console.error('Error parsing saved view:', error);
      }
    }
  }, []);

  useEffect(() => {
    updateExpiredData();
    const intervalId = setInterval(() => {
      updateExpiredData();
    }, 60000); // 60000ms = 1 minute

    return () => clearInterval(intervalId);
  }, []);

  const handleViewChange = (newView: ViewType) => {
    setDashboardData(prevData => ({ ...prevData, currentView: newView }));
    localStorage.setItem(CACHE_KEYS.VIEW, JSON.stringify(newView));
  };

  const isWalletorAssetDetail = location.pathname.includes('/wallet') || location.pathname.includes('/asset');

  const handleDeleteWallet = async (address: string) => {
    try {
      await api.delete(`/dashboard/manage/delete_wallet/${address}`);
      
      const updatedWallets = dashboardData.wallets.data.filter(wallet => wallet.address !== address);
      
      setDashboardData(prevData => ({
        ...prevData,
        wallets: {
          data: updatedWallets,
          timestamp: Date.now()
        }
      }));
  
      localStorage.setItem(CACHE_KEYS.WALLETS, JSON.stringify({
        data: updatedWallets,
        timestamp: Date.now()
      }));
  
      return { success: true };
    } catch (error) {
      console.error('Error deleting wallet:', error);
      return { success: false, error: 'Failed to delete wallet' };
    }
  };

  const handleAddWallet = async (address: string, name: string, color: string, walletType: string) => {
    // Check if wallet exists locally
    const walletExists = dashboardData.wallets.data.some(wallet => wallet.address === address);
    if (walletExists) {
      return { success: false, error: 'Wallet already exists' };
    }
  
    try {
      const newWallet = await api.post(
        `/dashboard/manage/new_wallet/${address}`,
        { name, color, mode: walletType }
      ) as Wallet;
  
      // Create new array with updated data
      const updatedWallets = [...dashboardData.wallets.data, newWallet];
  
      // Update state
      setDashboardData(prevData => ({
        ...prevData,
        wallets: {
          data: updatedWallets,
          timestamp: Date.now()
        }
      }));
  
      // Update localStorage
      localStorage.setItem(CACHE_KEYS.WALLETS, JSON.stringify({
        data: updatedWallets,
        timestamp: Date.now()
      }));
  
      return { success: true };
    } catch (error) {
      console.error('Error adding wallet:', error);
      // Provide more specific error messages based on the error type
      if (error instanceof Error) {
        if (error.message.includes('500')) {
          return { success: false, error: 'Server error: Unable to process your request' };
        }
      }
      return { success: false, error: 'Network error: Unable to connect to server' };
    }
  };

  const handleEditWallet = async (wallet: Wallet): Promise<{ success: boolean; error?: string }> => {
    const updateData: WalletUpdateData = {
      name: wallet.name,
      color: wallet.color,
      mode: wallet.wallet_mode
    };
  
    console.log('Updating wallet:', wallet.address);
  
    try {
      const data = await api.put(
        `/dashboard/manage/update_wallet/${wallet.address}`,
        updateData
      ) as Wallet;
  
      // Create updated wallets array
      const updatedWallets = dashboardData.wallets.data.map(w =>
        w.address === data.address ? data : w
      );
  
      // Update state
      setDashboardData(prevWallets => ({
        ...prevWallets,
        wallets: {
          data: updatedWallets,
          timestamp: Date.now()
        }
      }));
  
      // Update localStorage with the new array
      localStorage.setItem(CACHE_KEYS.WALLETS, JSON.stringify({
        data: updatedWallets,
        timestamp: Date.now()
      }));
  
      return { success: true };
    } catch (error) {
      console.error('Error updating wallet:', error);
      
      // Handle different types of errors
      if (error instanceof Error) {
        const errorMessage = error.message;
        if (errorMessage.includes('detail')) {
          return {
            success: false,
            error: errorMessage
          };
        }
      }
  
      return {
        success: false,
        error: 'Network error: Unable to connect to server'
      };
    }
  };

  const renderView = () => {

    if (isWalletorAssetDetail) {
      return <Outlet />;
    }

    const view = dashboardData.currentView || 'Wallets';

    switch (view) {      
      case 'Wallets':
        return <WalletsView
          wallets={dashboardData.wallets.data}
          onViewChange={handleViewChange}
          isLoading={loadingStates.wallets}
          lastUpdated={dashboardData.wallets.timestamp}
        />;
      case 'Assets':
        return <AssetsView wallets={dashboardData.wallets.data} isLoading={loadingStates.wallets} />;
      case 'Manage':
        return (
          <ManageWallets
            wallets={dashboardData.wallets.data}
            onViewChange={handleViewChange}
            onDeleteWallet={handleDeleteWallet}
            onAddWallet={handleAddWallet}
            onEditWallet={handleEditWallet}

          />
        );
      default:
        return <WalletsView 
        wallets={dashboardData.wallets.data}
        onViewChange={handleViewChange}
        isLoading={loadingStates.wallets}
        lastUpdated={dashboardData.wallets.timestamp}
        />;
    }
  };

  return (
    <div className="default-page">
      <div className="page-header">
        <div className="custom-headers">
          <h1>Wealth Dashboard</h1>
          {!isWalletorAssetDetail && (
            <Viewselector currentView={dashboardData.currentView} onViewChange={handleViewChange} />
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