import React from 'react';
import { CryptoCategory } from '../../data/dashboarddata';
import './CryptoCatagorieList.css'

interface CryptoCategoriesSidebarProps {
  categories: CryptoCategory[];
}

const CryptoCategoriesSidebar: React.FC<CryptoCategoriesSidebarProps> = ({ categories }) => {
  const sortedCategories = categories
    .sort((a, b) => parseFloat(b.change24h) - parseFloat(a.change24h));

  return (
    <div className="crypto-categories-sidebar">
      <h2>Categories</h2>
      <div className="category-list">
        <div className="category-header">
          <span>Category</span>
          <span>24h</span>
          <span>7d</span>
          <span># of coins</span>
        </div>
        {sortedCategories.map((category, index) => (
          <div key={index} className="category-item">
            <span>{category.category}</span>
            <span className={parseFloat(category.change24h) >= 0 ? 'positive' : 'negative'}>{category.change24h}</span>
            <span className={parseFloat(category.change7d) >= 0 ? 'positive' : 'negative'}>{category.change7d}</span>
            <span>{category.numberOfCoins}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CryptoCategoriesSidebar;



// import React from 'react';
// import { CryptoCategory } from '../../data/dashboarddata';
// import './CryptoCatagorieList.css'

// interface CryptoCategoriesSidebarProps {
//   categories: CryptoCategory[];
// }

// const CryptoCategoriesSidebar: React.FC<CryptoCategoriesSidebarProps> = ({ categories }) => {
//   const topEarners = categories.filter(cat => parseFloat(cat.change24h) >= 0)
//     .sort((a, b) => parseFloat(b.change24h) - parseFloat(a.change24h))
//     .slice(0, 5);

//   const topLosers = categories.filter(cat => parseFloat(cat.change24h) < 0)
//     .sort((a, b) => parseFloat(a.change24h) - parseFloat(b.change24h))
//     .slice(0, 5);

//   const CategoryList: React.FC<{ categories: CryptoCategory[], title: string }> = ({ categories, title }) => (
//     <div className="category-list">
//       <h3>{title}</h3>
//       <div className="category-header">
//         <span>Category</span>
//         <span>24h</span>
//         <span>7d</span>
//         <span># of coins</span>
//       </div>
//       {categories.map((category, index) => (
//         <div key={index} className="category-item">
//           <span>{category.category}</span>
//           <span className={parseFloat(category.change24h) >= 0 ? 'positive' : 'negative'}>{category.change24h}</span>
//           <span className={parseFloat(category.change7d) >= 0 ? 'positive' : 'negative'}>{category.change7d}</span>
//           <span>{category.numberOfCoins}</span>
//         </div>
//       ))}
//     </div>
//   );

//   return (
//     <div className="crypto-categories-sidebar">
//       <h2>Categories</h2>
//       <CategoryList categories={topEarners} title="Top Earners" />
//       <CategoryList categories={topLosers} title="Top Losers" />
//     </div>
//   );
// };

// export default CryptoCategoriesSidebar;