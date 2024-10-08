import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import './index.css'

const App: React.FC = () => {
  return (
    <div className="root-wrapper">
      <Sidebar />
      <div className="outlet-wrapper">
        <Outlet />
      </div>
    </div>
  );
};

export default App;