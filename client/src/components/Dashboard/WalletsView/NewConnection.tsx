import React, { useState } from 'react';
import './NewConnection.css'

const NewConnection: React.FC = () => {
  const [walletAddress, setWalletAddress] = useState('');
  const [portfolioName, setPortfolioName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#FF0000');

  const fetchWalletInfo = () => {
    console.log('Fetching wallet information...');
    window.location.href = "/Dashboard"
  };

  return (
    <div className="new-connection">
      <h2>New Wallet Connection</h2>
      
      <div className="color-selector">
        <label htmlFor="colorPicker">Color Selector</label>
        <input
          type="color"
          id="colorPicker"
          value={selectedColor}
          onChange={(e) => setSelectedColor(e.target.value)}
        />
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

      <button className="create-btn" onClick={fetchWalletInfo}>Create Connection</button>
    </div>
  );
};

export default NewConnection;