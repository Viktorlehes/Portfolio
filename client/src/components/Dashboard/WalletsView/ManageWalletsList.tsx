import React from 'react';
import './ManageWalletsList.css'
import { components } from '../../../types/api-types';

type Wallet = components["schemas"]["Wallet"];

interface ManageWalletsListProps {
  wallets: Wallet[];
  onDeleteWallet: (address: string) => void;
  onEditWallet: (wallet: Wallet) => void;
}

const ManageWalletsList: React.FC<ManageWalletsListProps> = ({
  wallets,
  onDeleteWallet,
  onEditWallet
}) => {

  const shortenAddress = (address: string, startLength: number = 8, endLength: number = 8): string => {
    return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
  };

  const handleEdit = (wallet: Wallet) => {
    onEditWallet(wallet);
  };

  const handleRemove = (address: string) => {
    onDeleteWallet(address);
  };

  return (
    <div className="manage-wallets">
      <h2>Manage Wallets</h2>
      <ul className="wallet-list">
        {wallets.map((wallet) => (
          <li key={wallet.address} className="wallet-item">
            <div className="wallet-info">
              <h3>{wallet.name}</h3>
              <p>{shortenAddress(wallet.address)}</p>
            </div>
            <div className="wallet-actions">
              <button onClick={() => handleEdit(wallet)} className="edit-btn">
                Edit
              </button>
              <button onClick={() => handleRemove(wallet.address)} className="remove-btn">
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ManageWalletsList;