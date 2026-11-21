import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ArcadeIcon } from '../ui/ArcadeIcon';
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
    <header className="top">
      {/* Non-admin Player View: Token Balance Chip & Username */}
      {!isAdmin && isAuthenticated && user && (
        <>
          <span className="chip t" title="Token Balance">
            <ArcadeIcon name="pad" />
            <b id="tk">{user.credits.toLocaleString()}</b> tokens
          </span>
          <span className="who">{user.username}</span>
        </>
      )}

      {/* Admin View Indicator */}
      {isAdmin && isAuthenticated && user && (
        <span className="chip x" style={{ color: 'var(--v)' }}>
          <ArcadeIcon name="shield" />
          <b>Admin</b> console
        </span>
      )}

      {/* Action / Auth controls */}
      {isAuthenticated && user ? (
        <button
          onClick={handleLogout}
          className="btn-logout"
          title="Sign out of Time2Earn"
          aria-label="Sign out"
        >
          <ArcadeIcon name="logout" size={16} />
          <span>Exit</span>
        </button>
      ) : (
        <Link to="/login" className="btn-login" aria-label="Sign in">
          <ArcadeIcon name="user" size={16} />
          <span>Login</span>
        </Link>
      )}
    </header>
  );
};
