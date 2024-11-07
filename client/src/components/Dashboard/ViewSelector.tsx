import React from 'react';
import './viewselector.css';

export type ViewType = 'Wallets' | 'Assets' | 'Manage';

interface ViewSelectorProps {
    currentView: ViewType;
    onViewChange: (view: ViewType) => void;
}

const Viewselector: React.FC<ViewSelectorProps> = ({ currentView, onViewChange }) => {
  return (
    <div className="wallet-selector">
      <select
        value={currentView}
        onChange={(e) => onViewChange(e.target.value as ViewType)}
      >
        <option value="Wallets">Wallet View</option>
        <option value="Assets">Asset View</option>
      </select>
    </div>
  );
};

export default Viewselector;