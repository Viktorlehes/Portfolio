import React from 'react';
import { X } from 'lucide-react';
import './SelectedCategories.css';
import { components } from '../../../types/api-types';
import { FetchState } from '../../../utils/api';

type UserCategories = components["schemas"]["UserCategories"];

interface SelectedCategoriesProps {
  userCategories: FetchState<UserCategories>;
  nullStates: {
    defaultCategoriesState: boolean,
    userCategoriesState: boolean,
    defaultTokensState: boolean
  };
  handleRemoveCategory: (categoryId: string) => void;
  handleRemoveCustomCategory: (categoryId: string) => void;
}

const SelectedCategories: React.FC<SelectedCategoriesProps> = ({ userCategories, nullStates, handleRemoveCategory, handleRemoveCustomCategory }) => {
  return (
    <div className="manage-categories">
      <h1>Active Categories</h1>

      <div className="selected-categories-container">
        <div className="category-section">
          <h2 className="category-list-section-header">CMC Categories</h2>
          <ul className="categories">
            {!nullStates.userCategoriesState ? userCategories.data?.default_categories && userCategories.data?.default_categories.map((category, index) => (
              <li key={index} className="category-item">
                <div className="category-header">
                  <div className="category-title">
                    <span className="category-name">{category.name}</span>
                    <span className="token-count">{category.num_tokens} tokens</span>
                  </div>
                  <button className="remove-button">
                    <X size={16}
                      onClick={() => handleRemoveCategory(category.id)}
                    />
                  </button>
                </div>
              </li>
            )) :
              <li className='category-item'>
                <div>
                  {userCategories.error ?
                    <span>Something went wrong: {userCategories.error}</span>
                    :
                    <span>Loading...</span>
                  }
                </div>
              </li>
            }
          </ul>
        </div>

        <div className="category-section">
          <h2 className="category-list-section-header">Custom Categories</h2>
          <ul className="categories">
            {!nullStates.userCategoriesState ? userCategories.data?.custom_categories && userCategories.data?.custom_categories.map((category, index) => (
              <li key={index} className="category-item">
                <div className="category-header">
                  <div className="category-title">
                    <span className="category-name">{category.name}</span>
                    <span className="token-count">({category.tokens.length} tokens)</span>
                  </div>
                  <button className="remove-button">
                    <X size={16}
                      onClick={() => handleRemoveCustomCategory(category.id)}
                    />
                  </button>
                </div>
                <div className="coins-list">
                </div>
              </li>
            ))
              :
              <li className='category-item'>
                <div>
                  {userCategories.error ?
                    <span>Something went wrong: {userCategories.error}</span>
                    :
                    <span>Loading...</span>
                  }
                </div>
              </li>
            }
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SelectedCategories;