import React, { useState } from 'react';
import { components } from '../../../types/api-types';
import './ManageWalletsList.css';

type Wallet = components["schemas"]["Wallet"];

interface ManageWalletsListProps {
  wallets: Wallet[];
  onDeleteWallet: (address: string) => void;
  onEditWallet: (wallet: Wallet) => Promise<{success: boolean; error?: string}>;
}

const ManageWalletsList: React.FC<ManageWalletsListProps> = ({
  wallets,
  onDeleteWallet,
  onEditWallet
}) => {
  const [expandedWallet, setExpandedWallet] = useState<string | null>(null);
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const colorOptions = [
    { label: 'Safe', color: '#22c55e' },
    { label: 'Normal', color: '#f97316' },
    { label: 'Risky', color: '#ef4444' }
  ];

  const shortenAddress = (address: string, startLength: number = 8, endLength: number = 8): string => {
    return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
  };

  const handleEdit = (wallet: Wallet) => {
    if (expandedWallet === wallet.address) {
      setExpandedWallet(null);
      setEditingWallet(null);
    } else {
      setExpandedWallet(wallet.address);
      setEditingWallet({ ...wallet });
    }
  };

  const handleRemove = (address: string) => {
    onDeleteWallet(address);
  };

  const handleSubmitEdit = async () => {
    if (!editingWallet) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const result = await onEditWallet(editingWallet);
      if (result.success) {
        setTimeout(() => {
          setExpandedWallet(null);
          setEditingWallet(null);
          setIsLoading(false);
        }, 1000);
      } else {
        setError(result.error || 'An unexpected error occurred');
        setIsLoading(false);
      }
    } catch (error) {
      setError('Failed to update wallet');
      setIsLoading(false);
    }
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
                {expandedWallet === wallet.address ? 'Close' : 'Edit'}
              </button>
              <button onClick={() => handleRemove(wallet.address)} className="remove-btn">
                Remove
              </button>
            </div>
            {expandedWallet === wallet.address && editingWallet && (
              <div className="edit-section">
                <div className="full-address">
                  <label>Wallet Address</label>
                  <p>{wallet.address}</p>
                </div>
                <div className="edit-field">
                  <label>Name</label>
                  <input
                    type="text"
                    value={editingWallet.name}
                    onChange={(e) => setEditingWallet({
                      ...editingWallet,
                      name: e.target.value
                    })}
                    maxLength={24}
                  />
                  <p className="char-count">{editingWallet.name.length}/24 characters</p>
                </div>
                <div className="edit-field">
                  <label>Risk Level</label>
                  <div className="color-boxes">
                    {colorOptions.map((option) => (
                      <div
                        key={option.label}
                        className={`color-box ${editingWallet.color === option.color ? 'selected' : ''}`}
                        onClick={() => setEditingWallet({
                          ...editingWallet,
                          color: option.color
                        })}
                        style={{
                          backgroundColor: option.color,
                        }}
                      >
                        <span className="color-label">{option.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="edit-field">
                  <label>Wallet Type</label>
                  <select
                    value={editingWallet.wallet_mode}
                    onChange={(e) => setEditingWallet({
                      ...editingWallet,
                      wallet_mode: e.target.value as "simple" | "full"
                    })}
                  >
                    <option value="simple">Simple</option>
                    <option value="full">Full</option>
                  </select>
                  <p className="info-text">
                    Simple - Only tokens<br />
                    Full - Tokens and defi positions
                  </p>
                </div>
                {error && <p className="error-message">{error}</p>}
                <button 
                  className="save-btn" 
                  onClick={handleSubmitEdit}
                  disabled={isLoading}
                >
                  Save Changes
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {isLoading && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-content">
              <div className="loading-spinner"></div>
              <p>Updating wallet...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageWalletsList;