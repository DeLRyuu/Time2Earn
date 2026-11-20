import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../ui/Badge';
import './Header.css';

interface HeaderProps {
  isAdmin?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ isAdmin = false }) => {
  return (
    <header className="app-header">
      <div className="header-mobile-brand">
        <Link to={isAdmin ? "/admin" : "/player"} className="mobile-brand-link">
          <span className="mobile-brand-logo">⚡</span>
          <span className="mobile-brand-title">TIME<span className="highlight">2</span>EARN</span>
        </Link>
      </div>

      <div className="header-status-bar">
        {!isAdmin && (
          <div className="player-quick-stats">
            <div className="stat-pill credits-pill" title="Spendable Credits">
              <span className="stat-icon">🪙</span>
              <span className="stat-val">332</span>
              <span className="stat-label">CR</span>
            </div>
            <div className="stat-pill exp-pill" title="Current Level EXP">
              <span className="stat-icon">⚡</span>
              <span className="stat-val">1,251</span>
              <span className="stat-label">EXP</span>
            </div>
            <div className="rank-badge-wrap">
              <Badge variant="gold" size="sm">Gamer</Badge>
            </div>
          </div>
        )}

        {isAdmin && (
          <div className="admin-status-wrap">
            <Badge variant="danger" size="sm">STAFF CONSOLE</Badge>
          </div>
        )}

        <div className="header-actions">
          <Link to="/login" className="login-link">
            <span className="login-avatar">👤</span>
            <span className="login-label">Account</span>
          </Link>
        </div>
      </div>
    </header>
  );
};
