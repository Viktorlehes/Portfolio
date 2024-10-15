// src/pages/Dashboard.tsx
import React from "react";
import { useLoaderData, LoaderFunction } from "react-router-dom";
import { ViewType } from "../../components/Dashboard/ViewSelector";
import CustomNavbar from "../../components/Default/CustomNavBar";
import Viewselector from "../../components/Dashboard/ViewSelector";
import WalletsView from "../../components/Dashboard/WalletsView/WalletsView"
import AssetsView from '../../components/Dashboard/AssetsView/AssetsView'
import {
  assetsPortfolio1,
  assetsPortfolio2,
  assetsPortfolio3,
  data,
} from "../../data/dashboarddata";
import "./Dashboard.css";

export const dashboardLoader: LoaderFunction = () => {
  const savedView = localStorage.getItem('dashboardView');
  return { currentView: (savedView as ViewType) || 'Wallets' };
};

const Dashboard: React.FC = () => {
  const { currentView } = useLoaderData() as { currentView: ViewType };
  const [localView, setLocalView] = React.useState<ViewType>(currentView);

  const handleViewChange = (newView: ViewType) => {
    setLocalView(newView);
    localStorage.setItem('dashboardView', newView);
  };

  const renderView = () => {
    switch (localView) {
      case 'Wallets':
        return <WalletsView assetsPortfolio1={assetsPortfolio1} assetsPortfolio2={assetsPortfolio2} assetsPortfolio3={assetsPortfolio3} data={data}/>;
      case 'Assets':
        return <AssetsView />;
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