// src/pages/Assets.tsx
import React from 'react';

const Assets: React.FC = () => {
  return (
    <div>
      <h2>Assets</h2>
      {/* Asset categories and numbers can be added here */}
      <ul>
        <li>Real Estate: $5,425,000</li>
        <li>Stocks & ETFs: $3,391,000</li>
        <li>Bonds: $2,034,000</li>
        <li>Crypto: $1,356,000</li>
        <li>Cash: $949,000</li>
      </ul>
    </div>
  );
};

export default Assets;
