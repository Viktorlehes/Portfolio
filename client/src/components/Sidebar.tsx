import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Wallet, PanelsTopLeft } from 'lucide-react';
import './Sidebar.css';

const Sidebar: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const menuItems = [
    { icon: PanelsTopLeft, text: 'Overview', path: '/' },
    { icon: LayoutDashboard, text: 'Dashboard', path: '/Dashboard' },
    { icon: Wallet, text: 'Bundles', path: '/Bundles' },
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