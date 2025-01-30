import React, { StrictMode } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './components/Default/Sidebar';
import './index.css'
import { ActiveFetchesProvider } from './context/ActiveFetchesContext';

const App: React.FC = () => {
  return (
    <StrictMode>
    <div className="app-container">
      <Sidebar />
      <div className="main-container">
        <ActiveFetchesProvider>
          <Outlet />
        </ActiveFetchesProvider>
      </div>
    </div>
    </StrictMode>
  );
};

export default App;