import React, {useState, useEffect} from 'react';
import './CryptoCategorieList.css';
import { components } from '../../../types/api-types';
import { formatCurrencySuffix } from '../../../utils/calc';
import { Settings2 } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { FetchState } from '../../../utils/api';

type CategoryData = components['schemas']['UserCategories'];
type DefaultCategory = components['schemas']['DefaultCategory']
type CustomCategory = components['schemas']['CustomCategory'];

interface CryptoCategoriesListProps {
  categories: FetchState<CategoryData>;
}

interface CategoryRowProps {
  category: DefaultCategory | CustomCategory;
  onClick: (name: string) => void;
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
    <tr className="category-row" onClick={() => onClick(category.name)}>
      <td>{category.name}</td>
      <td className={getChangeClass(category.avg_price_change)}>
        {category.avg_price_change > 0 ? '+' : ''}
        {category.avg_price_change.toFixed(2)}%
      </td>
      <td className="market-cap-cell">
        {formatCurrencySuffix(category.market_cap)}
      </td>
    </tr>
  );
};

export const CryptoCategoriesList: React.FC<CryptoCategoriesListProps> = ({ 
  categories, 
}) => {
  const [showNull, setShowNull] = useState(categories.isLoading)

  useEffect(() => {
    if (categories.isLoading) {
      setShowNull(categories.isLoading)
    } else {
      setShowNull( (categories.error ? true : false))
    }
  }, [categories])

  const navigate = useNavigate();

  const handleRedirect = (name: string) => {
    //replace spaces with dashes and lowercase
    name = name.replace(/\s/g, '-').toLocaleLowerCase();
    window.open(`https://coinmarketcap.com/view/${name}`, '_blank');
  };

  const allCategories = !showNull ? [...(categories.data?.default_categories || []), ...(categories.data?.custom_categories || [])] : [];
  const sortedCategories = allCategories.sort((a, b) => b.market_cap - a.market_cap);
  
  return (
    <div className="table-container categories-container">
      <div className="table-scroll">
        <div className='catagories-container-edit'>
          <div className='catagories-container-title'>Categories</div>
          <section className='categories-container-details'>
            <button className='catagories-container-edit-button'>
              <Settings2 size={20} 
              onClick={() => navigate('/ManageCatagories')}
              />
            </button> 
          </section>
        </div>
        <table className="tokens-table categories-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>24h%</th>
              <th>Mc</th>
            </tr>
          </thead>
          <tbody>
            {!showNull && sortedCategories.map((category, index) => (
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