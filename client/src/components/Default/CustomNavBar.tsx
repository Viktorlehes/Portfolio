import { useState } from 'react';
import './CustomNavBar.css'

interface Link {
  id?: number;
  name: string;
  url: string;
}

const CustomNavbar = () => {
  const [links, setLinks] = useState([
    // { id: 1, name: 'Coinmarketcap', url: 'https://coinmarketcap.com/' },
    // { id: 2, name: 'Glassnode', url: 'https://studio.glassnode.com/home' },
    // { id: 3, name: 'Parsec', url: 'https://parsec.fi/dashboard' },
    // { id: 4, name: 'TokenMetrics', url: 'https://app.tokenmetrics.com/en/market' },
    // { id: 5, name: 'Intellectia', url: 'https://app.intellectia.ai/crypto' },
  ] as Link[]);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [newLink, setNewLink] = useState({ name: '', url: '' });

  const handleAdd = () => {
    if (newLink.name && newLink.url) {
      setLinks([...links, { id: Date.now(), ...newLink }]);
      setNewLink({ name: '', url: '' });
      setIsDropdownOpen(false);
    }
  };

//   const handleDelete = (id: number) => {
//     setLinks(links.filter(link => link.id !== id));
//   };

  return (
    <div className="navbar-container">
      <nav className="navbar">
        {links.map(link => (
          <div key={link.id} className="nav-item">
            <a href={link.url} target="_blank" rel="noopener noreferrer" className="nav-link">{link.name}</a>
            {/* <button onClick={() => handleDelete(link.id)} className="delete-button">×</button> */}
          </div>
        ))}
        <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="add-button">
          +
        </button>
      </nav>
      <div className='navbar-links'>
      {isDropdownOpen && (
        <div className="dropdown">
          <input
            type="text"
            placeholder="Name"
            value={newLink.name}
            onChange={(e) => setNewLink({ ...newLink, name: e.target.value })}
            className="dropdown-input"
          />
          <input
            type="text"
            placeholder="URL"
            value={newLink.url}
            onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
            className="dropdown-input"
          />
          <button onClick={handleAdd} className="add-link-button">Add Link</button>
        </div>
      )}
      </div>
    </div>
  );
};

export default CustomNavbar;