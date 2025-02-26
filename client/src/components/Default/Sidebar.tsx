import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, PanelsTopLeft, HandCoins, BellRing, LogOut } from "lucide-react";
import { useAuth } from "../../auth/authContext";
import logo from "../../assets/Matrix_logo.png"
import './Sidebar.css'

const Sidebar: React.FC = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;
  const { logout } = useAuth()

  const menuItems = [
    { icon: PanelsTopLeft, text: "Overview", path: "/" },
    { icon: LayoutDashboard, text: "Dashboard", path: "/Dashboard" },
    { icon: HandCoins, text: "Defi", path: "/Defi" },
    { icon: BellRing, text: "Alerts", path: "/Alerts" },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
        <img src={logo} alt="M"/>
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
        <ul>
          <li key={"logout"}>
              <Link
                onClick={() => logout()}
                to={"/"}
                className={`sidebar-link`}
              >
                <LogOut
                  className={`sidebar-icon`}
                  size={20}
                />
                <span
                  className={`sidebar-text`}
                >
                  Logout
                </span>
              </Link>
            </li>
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;