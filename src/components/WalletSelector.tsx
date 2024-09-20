import React, { useState } from 'react';
import './WalletSelector.css';

interface Wallet {
  name: string;
  value: number;
}

const wallets: Wallet[] = [
  { name: 'All Wallets', value: 60000 },
  { name: 'Coinbase', value: 30000 },
  { name: 'Nexo', value: 20000 },
  { name: 'Uniswap', value: 10000 },
];

interface WalletSelectorProps {
  onWalletChange: (wallet: Wallet) => void;
}

const WalletSelector: React.FC<WalletSelectorProps> = ({ onWalletChange }) => {
  const [selectedWallet, setSelectedWallet] = useState<Wallet>(wallets[0]);

  const handleWalletChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const wallet = wallets.find(w => w.name === event.target.value) || wallets[0];
    setSelectedWallet(wallet);
    onWalletChange(wallet);
  };

  return (
    <div className="wallet-selector">
      <select
        value={selectedWallet.name}
        onChange={handleWalletChange}
      >
        {wallets.map((wallet) => (
          <option key={wallet.name} value={wallet.name}>
            {wallet.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default WalletSelector;