import React, { useState } from 'react';
import './NewConnection.css';
interface NewConnectionProps {
  onAddWallet: (address: string, name: string, color: string, walletType: string) => Promise<{ success: boolean; error?: string }>;
}

const NewConnection: React.FC<NewConnectionProps> = ({onAddWallet}) => {
  const [walletAddress, setWalletAddress] = useState('');
  const [portfolioName, setPortfolioName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#22c55e'); // Default to safe (green)
  const [walletType, setWalletType] = useState('simple');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const colorOptions = [
    { label: 'Safe', color: '#22c55e' },
    { label: 'Normal', color: '#f97316' },
    { label: 'Risky', color: '#ef4444' }
  ];

  const resetStates = () => {
    setIsLoading(false);
    setShowSuccess(false);
    setError(null);
  };

  const resetForm = () => {
    setWalletAddress('');
    setPortfolioName('');
    setSelectedColor('#22c55e');
    setWalletType('simple');
  };

  const addWalletInfo = async () => {
    resetStates();
    setIsLoading(true);
    
    try {
      const result = await onAddWallet(walletAddress, portfolioName, selectedColor, walletType);
      
      if (result.success) {
        setShowSuccess(true);
        setTimeout(() => {
          resetStates();
          resetForm();
        }, 2000);
      } else {
        setError(result.error || 'An unexpected error occurred');
        setTimeout(() => {
          resetStates();
        }, 3000);
      }
    } catch (error) {
      setError('Server error: Unable to process your request');
      setTimeout(() => {
        resetStates();
      }, 3000);
    } finally {
      if (!showSuccess) {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="new-connection">
      <h2>New Wallet Connection</h2>
      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}
      <div className="color-selector">
        <label>Wallet Type</label>
        <div className="color-boxes">
          {colorOptions.map((option) => (
            <div
              key={option.label}
              className={`color-box ${selectedColor === option.color ? 'selected' : ''}`}
              onClick={() => setSelectedColor(option.color)}
              style={{
                backgroundColor: option.color,
              }}
            >
              <span className="color-label">{option.label}</span>
            </div>
          ))}
        </div>
        <p className="info-text">
          A safe wallet is for long-term holds, normal is for regular trading, and risky is for high-risk trading.
          Default Alerts will be based on the wallet type you select.
        </p>
      </div>
      <div className="wallet-address">
        <label htmlFor="walletAddress">Wallet Address</label>
        <input
          type="text"
          id="walletAddress"
          placeholder="Enter a public address"
          value={walletAddress}
          onChange={(e) => setWalletAddress(e.target.value)}
        />
        <p className="info-text">
          We are only requesting view permissions. This does not give us access to
          your private keys nor the ability to move your assets.
        </p>
      </div>
      <div className="portfolio-name">
        <label htmlFor="portfolioName">Wallet Name</label>
        <input
          type="text"
          id="portfolioName"
          placeholder="Enter your portfolio name"
          value={portfolioName}
          onChange={(e) => setPortfolioName(e.target.value)}
          maxLength={24}
        />
        <p className="char-count">{portfolioName.length}/24 characters</p>
      </div>
      <div className="wallet-type-selector">
        <label htmlFor="walletType">Wallet Type</label>
        <select
          id="walletType"
          value={walletType}
          onChange={(e) => setWalletType(e.target.value)}
        >
          <option value="simple">Simple</option>
          <option value="full">Full</option>
        </select>
        <p className="info-text wallet-type-info">
          Simple - Only tokens<br />
          Full - Tokens and defi positions
        </p>
      </div>
      <button 
        className="create-btn" 
        onClick={addWalletInfo}
        disabled={isLoading}
      >
        Create Connection
      </button>

      {(isLoading || showSuccess || error) && (
        <div className="modal-overlay">
          <div className="modal">
            {isLoading && !showSuccess && !error && (
              <div className="modal-content">
                <div className="loading-spinner"></div>
                <p>Adding wallet...</p>
              </div>
            )}
            {showSuccess && (
              <div className="modal-content success">
                <div className="success-icon">✓</div>
                <p>Wallet added successfully!</p>
              </div>
            )}
            {error && (
              <div className="modal-content error">
                <div className="error-icon">✕</div>
                <p>{error}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NewConnection;