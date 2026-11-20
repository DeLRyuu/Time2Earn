import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '../ui/Badge';
import { useAuth } from '../../hooks/useAuth';
import './Header.css';

interface HeaderProps {
  isAdmin?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ isAdmin = false }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="app-header">
      <div className="header-mobile-brand">
        <Link to={isAdmin ? "/admin" : "/player"} className="mobile-brand-link">
          <span className="mobile-brand-logo">⚡</span>
          <span className="mobile-brand-title">TIME<span className="highlight">2</span>EARN</span>
        </Link>
      </div>

      <div className="header-status-bar">
        {!isAdmin && user && (
          <div className="player-quick-stats">
            <div className="stat-pill credits-pill" title="Spendable Credits">
              <span className="stat-icon">🪙</span>
              <span className="stat-val">{user.credits.toLocaleString()}</span>
              <span className="stat-label">CR</span>
            </div>
            <div className="stat-pill exp-pill" title="Lifetime EXP">
              <span className="stat-icon">⚡</span>
              <span className="stat-val">{user.exp.toLocaleString()}</span>
              <span className="stat-label">EXP</span>
            </div>
            <div className="rank-badge-wrap">
              <Badge variant="gold" size="sm">{user.rank}</Badge>
            </div>
          </div>
        )}

        {isAdmin && (
          <div className="admin-status-wrap">
            <Badge variant="danger" size="sm">STAFF CONSOLE</Badge>
          </div>
        )}

        <div className="header-actions">
          {isAuthenticated && user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                {user.username}
              </span>
              <button
                onClick={handleLogout}
                title="Sign out of console"
                style={{
                  padding: '0.3rem 0.6rem',
                  fontSize: '0.75rem',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-xs)',
                  color: 'var(--danger)',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                LOGOUT
              </button>
            </div>
          ) : (
            <Link to="/login" className="login-link">
              <span className="login-avatar">👤</span>
              <span className="login-label">Login</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
