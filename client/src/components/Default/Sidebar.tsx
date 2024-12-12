import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, PanelsTopLeft, HandCoins } from "lucide-react";
import './Sidebar.css'

const Sidebar: React.FC = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;
  
  const menuItems = [
    { icon: PanelsTopLeft, text: "Overview", path: "/" },
    { icon: LayoutDashboard, text: "Dashboard", path: "/Dashboard" },
    { icon: HandCoins, text: "Defi", path: "/Defi" },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <span>M</span>
        </div>
        <span className="sidebar-title">Portfolio</span>
      </div>
      <nav className="sidebar-nav">
        <ul>
          {menuItems.map((item, index) => (
            <li key={index}>
              <Link
                to={item.path}
                className={`sidebar-link ${isActive(item.path) ? "active" : ""}`}
              >
                <item.icon
                  className={`sidebar-icon ${isActive(item.path) ? "active" : ""}`}
                  size={20}
                />
                <span
                  className={`sidebar-text ${isActive(item.path) ? "active" : ""}`}
                >
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