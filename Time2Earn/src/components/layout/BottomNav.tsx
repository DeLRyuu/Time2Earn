import React from 'react';
import { NavLink } from 'react-router-dom';
import './BottomNav.css';

export const BottomNav: React.FC = () => {
  return (
    <nav className="bottom-nav" aria-label="Mobile Navigation">
      <NavLink
        to="/player"
        end
        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
      >
        <span className="nav-icon">🏠</span>
        <span className="nav-label">Home</span>
      </NavLink>

      <NavLink
        to="/player/rewards"
        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
      >
        <span className="nav-icon">🎁</span>
        <span className="nav-label">Rewards</span>
      </NavLink>

      <NavLink
        to="/player/arcade"
        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
      >
        <span className="nav-icon">🕹️</span>
        <span className="nav-label">Arcade</span>
      </NavLink>

      <NavLink
        to="/player/leaderboard"
        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
      >
        <span className="nav-icon">🏆</span>
        <span className="nav-label">Rankings</span>
      </NavLink>

      <NavLink
        to="/player/profile"
        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
      >
        <span className="nav-icon">👤</span>
        <span className="nav-label">Profile</span>
      </NavLink>
    </nav>
  );
};
