import React, { useEffect, useState, useCallback } from 'react';
import { Search, Plus, X, ExternalLink, Loader } from 'lucide-react';
import { components } from '../../../types/api-types';
import { formatCurrencySuffix } from '../../../utils/calc';
import { FetchState } from '../../../utils/api';
import debounce from 'lodash/debounce';
import './CategoryManager.css';

type DefaultCategory = components["schemas"]["DefaultCategory"];
type Token = components["schemas"]['UnifiedToken'];

interface CategoryManagerProps {
  defaultCategories: FetchState<DefaultCategory[]>;
  defaultTokens: FetchState<Token[]>;
  nullStates: {
    defaultCategoriesState: boolean,
    userCategoriesState: boolean,
    defaultTokensState: boolean
  };
  handleAddCMCCategory: (category_id: string) => void;
  fetchSearchedTokens: (name: string) => Promise<Token[]>;
  handleCreateCustomCategory: (name: string, tokenIds: number[]) => Promise<void>;
}

const CategoryManager: React.FC<CategoryManagerProps> = ({
  defaultCategories,
  defaultTokens,
  nullStates,
  handleAddCMCCategory,
  fetchSearchedTokens,
  handleCreateCustomCategory
}) => {
  const [activeTab, setActiveTab] = useState("coingecko");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTokens, setSelectedTokens] = useState<Token[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Token[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (term: string) => {
      if (term.length < 2) {
        setSearchResults([]);
        setSearchError(null);
        return;
      }

      setIsSearching(true);
      setSearchError(null);

      try {
        const results = await fetchSearchedTokens(term);
        if (results.length === 0) {
          setSearchError("No tokens found");
        }
        setSearchResults(results);
      } catch (error) {
        setSearchError("Error searching tokens");
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500),
    [fetchSearchedTokens]
  );

  useEffect(() => {
    if (activeTab === 'custom') {
      debouncedSearch(searchTerm);
    }
    return () => debouncedSearch.cancel();
  }, [searchTerm, activeTab, debouncedSearch]);

  const filteredCategories = !nullStates.defaultCategoriesState ? defaultCategories.data!.filter(cat =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const displayTokens = searchTerm.length >= 2 ? searchResults : defaultTokens.data;
  const filteredTokens = !nullStates.defaultTokensState && displayTokens!.filter(token =>
    token.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    token.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [] as Token[];

  const handleCreateCategory = () => {
    if (!categoryName.trim()) {
      return;
    }
    if (selectedTokens.length === 0) {
      return;
    }
    
    const tokenIds = selectedTokens.map(token => token.cmc_id);
    console.log('Creating custom category:', categoryName, tokenIds);
    
    handleCreateCustomCategory(categoryName, tokenIds)
      .then(() => {
        // Reset form after successful creation
        setCategoryName("");
        setSelectedTokens([]);
      })
      .catch(error => {
        console.error('Error creating custom category:', error);
        // Consider adding error feedback here
      });
  };

  const renderTokensList = () => {
    if (isSearching) {
      return (
        <div className="search-state-container">
          <Loader className="animate-spin" />
          <p>Searching tokens...</p>
        </div>
      );
    }

    if (searchError) {
      return (
        <div className="search-state-container">
          <p>{searchError}</p>
        </div>
      );
    }

    return filteredTokens.map((token) => (
      <div
        key={token.name}
        className="list-item"
        onClick={() => setSelectedTokens(prev => {
          if (!prev.find(t => t.name === token.name)) {
            return [...prev, token];
          }
          return prev;
        })}
      >
        <span>{token.name} ({token.symbol})</span>
        <button className="add-button">
          <Plus size={16} />
        </button>
      </div>
    ));
  };

  return (
    <div className="category-manager">
      <div className="tabs">
        <div className="tabs-list">
          <button
            className={`tab ${activeTab === 'coingecko' ? 'active' : ''}`}
            onClick={() => setActiveTab('coingecko')}
          >
            CMC Categories
          </button>
          <button
            className={`tab ${activeTab === 'custom' ? 'active' : ''}`}
            onClick={() => setActiveTab('custom')}
          >
            Custom Categories
          </button>
        </div>

        <a className='coinmarketcap-link'
          href="https://coinmarketcap.com/cryptocurrency-category/"
          target="_blank"
          rel="noopener noreferrer">
          <div>View Coinmarketcap Categories</div>
          <ExternalLink size={16} className='coinmarketcap-link-link' />
        </a>

        <div className="search-container">
          <Search className="search-icon" />
          <input
            className="search-input"
            placeholder={`Search ${activeTab === 'coingecko' ? 'categories' : 'tokens'}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className={`tab-content ${activeTab === 'coingecko' ? 'active' : ''}`}>
          <div className="list-container">
            {filteredCategories.map((category) => (
              <div key={category.name} className="list-item">
                <div className="category-info">
                  <span>{category.name}</span>
                  <span className="category-detail">Tokens: {category.num_tokens}</span>
                  <span className="category-detail">MCap: {formatCurrencySuffix(category.market_cap)}</span>
                </div>
                <div className="category-actions">
                  <a
                    href={`https://www.coingecko.com/en/categories/${category.name}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="external-link"
                  >
                    <ExternalLink size={16} />
                  </a>
                  <button 
                    className="add-button"
                    onClick={() => handleAddCMCCategory(category.id)}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`tab-content ${activeTab === 'custom' ? 'active' : ''}`}>
          <div className="list-container">
            {renderTokensList()}
          </div>

          <div className="selected-tokens">
            <h3>Selected Tokens</h3>
            <div className="token-tags">
              {selectedTokens.map((token) => (
                <div key={token.name} className="token-tag">
                  <span>{token.symbol}</span>
                  <X
                    size={16}
                    className="remove-token"
                    onClick={() => setSelectedTokens(prev =>
                      prev.filter(t => t.name !== token.name)
                    )}
                  />
                </div>
              ))}
            </div>

            <div className="create-category">
              <input
                className="create-input"
                placeholder="Category name"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
              />
              <button 
              className="create-button"
              onClick={handleCreateCategory}
              disabled={!categoryName.trim() || selectedTokens.length === 0}
              >Create Category</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryManager;