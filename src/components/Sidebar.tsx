import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Wallet, CreditCard, BarChart2, FileText } from 'lucide-react';

const Sidebar: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const menuItems = [
    { icon: LayoutDashboard, text: 'Dashboard', path: '/' },
    { icon: Wallet, text: 'Assets', path: '/assets' },
    { icon: CreditCard, text: 'Liabilities', path: '/liabilities' },
    { icon: BarChart2, text: 'Cashflow', path: '/cashflow' },
    { icon: FileText, text: 'Reports', path: '/reports' },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <span>W</span>
        </div>
        <span className="sidebar-title">Wealthy</span>
      </div>
      <nav className="sidebar-nav">
        <ul>
          {menuItems.map((item, index) => (
            <li key={index}>
              <Link
                to={item.path}
                className={`sidebar-link ${isActive(item.path) ? 'active' : ''}`}
              >
                <item.icon className={`sidebar-icon ${isActive(item.path) ? 'active' : ''}`} />
                <span className={`sidebar-text ${isActive(item.path) ? 'active' : ''}`}>
                  {item.text}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;