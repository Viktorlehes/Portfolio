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
  WALLETS: 'http://127.0.0.1:8000/dashboard/wallets',
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
        fetch(API_ENDPOINTS.WALLETS)
          .then(res => res.json())
          .then(wallets => {
            newData.wallets = {
              data: wallets,
              timestamp: Date.now()
            };
            localStorage.setItem(CACHE_KEYS.WALLETS, JSON.stringify(newData.wallets));
            setLoadingStates(prev => ({ ...prev, wallets: false }));
          })
      );
    }
    if (updates.length > 0) {
      await Promise.all(updates);
      setDashboardData(newData);
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
      const response = await fetch(`http://127.0.0.1:8000/dashboard/manage/delete_wallet/${address}`, {
        method: 'DELETE',
      });

      if (response.status !== 204) {
        throw new Error('Failed to delete wallet');
      }

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
    const walletExists = dashboardData.wallets.data.some(wallet => wallet.address === address);

    if (walletExists) {
      return { success: false, error: 'Wallet already exists' };
    }

    try {
      const response = await fetch(`http://127.0.0.1:8000/dashboard/manage/new_wallet/${address}`, {
        method: 'POST',
        body: JSON.stringify({ name, color, mode: walletType }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const newWallet = await response.json() as Wallet;

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
          data: updatedWallets, // Use the new array, not spread operator
          timestamp: Date.now()
        }));

        return { success: true };
      } else {
        const errorMessage = response.status === 500 ?
          'Server error: Unable to process your request' :
          'An unexpected error occurred';
        return { success: false, error: errorMessage };
      }
    } catch (error) {
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
      const response = await fetch(`http://127.0.0.1:8000/dashboard/manage/update_wallet/${wallet.address}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.detail || 'Failed to update wallet'
        };
      }

      const data: Wallet = await response.json();

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