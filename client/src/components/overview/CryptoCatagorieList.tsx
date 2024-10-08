import React from "react";
import "./CryptoCatagorieList.css";

export interface Category {
  name: string;
  average_price_change: string;
  crypto_names: string[];
}

interface CryptoListProps {
  categories: Category[];
}

const CryptoList: React.FC<CryptoListProps> = ({ categories }) => {
  return (
    <div className="crypto-list">
      <h2>Catagories</h2>
      <ul>
        {categories.map((category, index) => (
          <li key={index} className="category-item">
            <div className="category-name">
              <span className="category-title">{category.name}</span>
              <span className="crypto-names">
                {category.crypto_names.join(", ")}
              </span>
            </div>
            <span
              className={`price-change ${
                category.average_price_change.startsWith("-") ? "down" : "up"
              }`}
            >
              {category.average_price_change}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CryptoList;
