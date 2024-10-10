import React, { useState } from 'react';
import './ManageWalletsList.css'

interface Wallet {
  id: string;
  name: string;
  address: string;
}

const ManageWalletsList: React.FC = () => {
  const [wallets, setWallets] = useState<Wallet[]>([
    { id: '1', name: 'Main Wallet', address: '0x1234...5678' },
    { id: '2', name: 'Savings Wallet', address: '0xabcd...efgh' },
    { id: '3', name: 'Trading Wallet', address: '0x9876...5432' },
  ]);

  const handleEdit = (id: string) => {
    console.log(`Editing wallet with id: ${id}`);
    // Implement edit functionality here
  };

  const handleRemove = (id: string) => {
    setWallets(wallets.filter(wallet => wallet.id !== id));
  };

  return (
    <div className="manage-wallets">
      <h2>Manage Wallets</h2>
      <ul className="wallet-list">
        {wallets.map((wallet) => (
          <li key={wallet.id} className="wallet-item">
            <div className="wallet-info">
              <h3>{wallet.name}</h3>
              <p>{wallet.address}</p>
            </div>
            <div className="wallet-actions">
              <button onClick={() => handleEdit(wallet.id)} className="edit-btn">Edit</button>
              <button onClick={() => handleRemove(wallet.id)} className="remove-btn">Remove</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ManageWalletsList;