import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ArcadeIcon } from '../ui/ArcadeIcon';
import tokenCoinImg from '../../assets/token/token-coin.png';
import settingImg from '../../assets/setting/settings.png';
import './Header.css';

interface HeaderProps {
  isAdmin?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ isAdmin = false }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate('/login');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="top">
      {/* Non-admin Player View: Token Balance Chip & Username */}
      {!isAdmin && isAuthenticated && user && (
        <>
          <span className="chip t" title="Token Balance">
            <img
              src={tokenCoinImg}
              alt=""
              aria-hidden="true"
              style={{
                width: '20px',
                height: '20px',
                objectFit: 'contain',
                display: 'block',
              }}
            />
            <b id="tk">{user.credits.toLocaleString()}</b> Tokens
          </span>
        </>
      )}

      {/* Admin View Indicator */}
      {isAdmin && isAuthenticated && user && (
        <span className="chip x" style={{ color: 'var(--v)' }}>
          <ArcadeIcon name="shield" />
          <b>Admin</b> console
        </span>
      )}

      {/* Settings Dropdown (Profile + Log-out) */}
      {isAuthenticated && user ? (
        <div className="settings-menu" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="btn-setting"
            title="Account & Settings"
            aria-label="Account & Settings"
            aria-expanded={menuOpen}
          >
            <img
              src={settingImg}
              alt=""
              aria-hidden="true"
              style={{
                width: '22px',
                height: '22px',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </button>

          {menuOpen && (
            <div className="settings-dropdown" role="menu">
              {!isAdmin && (
                <Link
                  to="/player/profile"
                  className="dropdown-item"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                >
                  <ArcadeIcon name="user" size={16} />
                  <span>Profile</span>
                </Link>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="dropdown-item danger"
                role="menuitem"
              >
                <ArcadeIcon name="logout" size={16} />
                <span>Log-out</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <Link to="/login" className="btn-login" aria-label="Sign in">
          <ArcadeIcon name="user" size={16} />
          <span>Login</span>
        </Link>
      )}
    </header>
  );
};