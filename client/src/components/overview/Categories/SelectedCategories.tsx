import React from 'react';
import { X } from 'lucide-react';
import './SelectedCategories.css';
import { components } from '../../../types/api-types';

type Category = components["schemas"]["CategoryData"];
type CustomCategory = components["schemas"]["CustomCategory"];

interface SelectedCategoriesProps {
  userCategories: Category[];
  customCategories: CustomCategory[];
  nullStates: {
    userCategories: boolean;
    customCategories: boolean;
  };
  handleRemoveCategory: (categoryId: string) => void;
  handleRemoveCustomCategory: (categoryId: string) => void;
}

const SelectedCategories: React.FC<SelectedCategoriesProps> = ({userCategories, customCategories, nullStates, handleRemoveCategory, handleRemoveCustomCategory}) => {
  return (
    <div className="manage-categories">
      <h1>Active Categories</h1>

      <div className="selected-categories-container">
        <div className="category-section">
          <h2 className="category-list-section-header">CMC Categories</h2>
          <ul className="categories">
            {!nullStates.userCategories && userCategories.map((category, index) => (
              <li key={index} className="category-item">
                <div className="category-header">
                  <div className="category-title">
                    <span className="category-name">{category.name}</span>
                    <span className="token-count">({category.num_tokens} tokens)</span>
                  </div>
                  <button className="remove-button">
                    <X size={16} 
                    onClick={() => handleRemoveCategory(category.id)}
                    />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="category-section">
          <h2 className="category-list-section-header">Custom Categories</h2>
          <ul className="categories">
            {!nullStates.customCategories && customCategories.map((category, index) => (
              <li key={index} className="category-item">
                <div className="category-header">
                  <div className="category-title">
                    <span className="category-name">{category.name}</span>
                    <span className="token-count">({category.num_tokens} tokens)</span>
                  </div>
                  <button className="remove-button">
                    <X size={16} 
                    onClick={() => handleRemoveCustomCategory(category.id)}
                    />
                  </button>
                </div>

                 <div className="coins-list">
                    {category.tokens_ids
                    .slice(0, 3)
                    .map((coin, idx) => (
                    <div key={idx} className="coin">
                      <span className="coin-symbol">{coin.symbol}</span>
                    </div>
                    ))}
                </div> 
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SelectedCategories;