import React from 'react';
import './CryptoCatagorieList.css';
import { components } from '../../types/api-types';
import { formatCurrencySuffix } from '../../utils/calc';

type CategoryResponse = components['schemas']['CategoryResponse'];

interface CryptoCategoriesListProps {
  categories: CategoryResponse | null;
  isLoading: boolean;
}

interface CategoryRowProps {
  category: CategoryResponse[0];
  onClick: (id: string) => void;
}

const CategoryRow: React.FC<CategoryRowProps> = ({ category, onClick }) => {
  const getChangeIntensity = (change: number): number => {
    const absChange = Math.abs(change);
    if (absChange < 1) return 1;
    if (absChange < 2) return 2;
    if (absChange < 5) return 3;
    if (absChange < 10) return 4;
    return 5;
  };

  const getChangeClass = (change: number) => {
    const direction = change >= 0 ? 'positive' : 'negative';
    const intensity = getChangeIntensity(change);
    return `change-cell change-cell-${direction} intensity-${intensity}`;
  };

  return (
    <tr className="category-row" onClick={() => onClick(category.id)}>
      <td>{category.name}</td>
      <td className={getChangeClass(category.market_cap_change_24h)}>
        {category.market_cap_change_24h > 0 ? '+' : ''}
        {category.market_cap_change_24h.toFixed(2)}%
      </td>
      <td className="market-cap-cell">
        {formatCurrencySuffix(category.market_cap)}
      </td>
      <td className="volume-cell">
        {formatCurrencySuffix(category.volume_24h)}
      </td>
    </tr>
  );
};

export const CryptoCategoriesList: React.FC<CryptoCategoriesListProps> = ({ 
  categories, 
  isLoading 
}) => {
  const handleRedirect = (id: string) => {
    window.open(`https://www.coingecko.com/en/categories/${id}`, '_blank');
  };

  const sortedCategories = React.useMemo(() => {
    if (!categories) return [];
    return [...categories].sort((a, b) => b.market_cap - a.market_cap);
  }, [categories]);

  return (
    <div className="table-container categories-container">
      <div className="table-scroll">
        <table className="tokens-table categories-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>24h%</th>
              <th>Mc</th>
              <th>Vol</th>
            </tr>
          </thead>
          <tbody>
            {!isLoading && categories && sortedCategories.map((category, index) => (
              <CategoryRow 
                key={index} 
                category={category} 
                onClick={handleRedirect}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CryptoCategoriesList;