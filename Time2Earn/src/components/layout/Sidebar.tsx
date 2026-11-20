import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Badge } from '../ui/Badge';
import './Sidebar.css';

interface SidebarProps {
  isAdmin?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isAdmin = false }) => {
  return (
    <aside className="app-sidebar" aria-label="Desktop Sidebar">
      <div className="sidebar-brand">
        <Link to={isAdmin ? "/admin" : "/player"} className="brand-link">
          <div className="brand-logo">⚡</div>
          <div className="brand-text">
            <span className="brand-name">TIME<span className="highlight">2</span>EARN</span>
            <span className="brand-tagline">Play. Earn. Rank Up. Redeem.</span>
          </div>
        </Link>
      </div>

      <div className="sidebar-nav-container">
        {isAdmin ? (
          <nav className="sidebar-nav">
            <div className="nav-section-title">ADMIN CONTROL</div>
            <NavLink to="/admin" end className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <span className="link-icon">📊</span>
              <span>Overview</span>
            </NavLink>
            <NavLink to="/admin/sessions" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <span className="link-icon">🎮</span>
              <span>Session Requests</span>
            </NavLink>
            <NavLink to="/admin/redemptions" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <span className="link-icon">🎁</span>
              <span>Redemptions</span>
            </NavLink>
            <NavLink to="/admin/debts" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <span className="link-icon">💳</span>
              <span>Debt Management</span>
            </NavLink>
            <NavLink to="/admin/rewards" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <span className="link-icon">🏷️</span>
              <span>Reward Catalog</span>
            </NavLink>
            <NavLink to="/admin/users" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <span className="link-icon">👥</span>
              <span>Player Accounts</span>
            </NavLink>
            <NavLink to="/admin/settings" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <span className="link-icon">⚙️</span>
              <span>System Config</span>
            </NavLink>
          </nav>
        ) : (
          <nav className="sidebar-nav">
            <div className="nav-section-title">PLAYER MENU</div>
            <NavLink to="/player" end className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <span className="link-icon">🏠</span>
              <span>Dashboard</span>
            </NavLink>
            <NavLink to="/player/rewards" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <span className="link-icon">🎁</span>
              <span>Reward Shop</span>
            </NavLink>
            <NavLink to="/player/arcade" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <span className="link-icon">🕹️</span>
              <span>Arcade Zone</span>
            </NavLink>
            <NavLink to="/player/leaderboard" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <span className="link-icon">🏆</span>
              <span>Rankings</span>
            </NavLink>
            <NavLink to="/player/profile" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <span className="link-icon">👤</span>
              <span>My Profile & Debts</span>
            </NavLink>
          </nav>
        )}
      </div>

      <div className="sidebar-footer">
        {isAdmin ? (
          <Link to="/player" className="switch-mode-btn">
            <span>Switch to Player View</span>
            <Badge variant="primary" size="sm">Player</Badge>
          </Link>
        ) : (
          <Link to="/admin" className="switch-mode-btn">
            <span>Admin Portal</span>
            <Badge variant="secondary" size="sm">Staff</Badge>
          </Link>
        )}
      </div>
    </aside>
  );
};
