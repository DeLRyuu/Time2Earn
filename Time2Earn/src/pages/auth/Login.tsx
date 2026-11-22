import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { ArcadeIcon } from '../../components/ui/ArcadeIcon';
import {
  consumePrefillLogin,
  getRegisteredUsers,
  removeRegisteredUser,
  type RegisteredUser,
} from './authRegistration';
import webIconImg from '../../assets/sidebar/web-icon.png';
import tokenCoinImg from '../../assets/token/token-coin.png';
import streakImg from '../../assets/streak/streak.png';
import prizeShopImg from '../../assets/sidebar/prize-shop.png';
import './AuthPages.css';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setRegisteredUsers(getRegisteredUsers());
    const prefill = consumePrefillLogin();
    if (prefill) {
      setUsername(prefill.username);
      setPassword(prefill.password);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanUsername = username.trim();
    if (!cleanUsername || !password) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    setIsLoading(true);
    const res = await login(cleanUsername, password);
    setIsLoading(false);

    if (res.success) {
      showToast(`Welcome back, ${cleanUsername}!`, 'success');
      if (cleanUsername.toLowerCase() === 'admin') {
        navigate('/admin');
      } else {
        navigate('/player');
      }
    } else {
      setErrorMessage(res.error || 'Login failed. Please check your credentials.');
      showToast(res.error || 'Authentication error', 'error');
    }
  };

  const handleQuickFill = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setErrorMessage(null);
  };

  const handleDeleteRegisteredUser = (e: React.MouseEvent, userToDelete: string) => {
    e.stopPropagation();
    removeRegisteredUser(userToDelete);
    setRegisteredUsers(getRegisteredUsers());
    if (username.toLowerCase() === userToDelete.toLowerCase()) {
      setUsername('');
      setPassword('');
    }
    showToast(`Removed ${userToDelete} from saved roster.`, 'info');
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        {/* Arcade Brand Marquee */}
        <div className="auth-header">
          <div className="auth-logo-badge">
            <img src={webIconImg} alt="Time2Earn Arcade" />
          </div>
          <h1 className="auth-title">
            TIME<span className="highlight">2</span>EARN
          </h1>
          <div className="auth-subtitle">
            <span>Play</span>
            <span className="auth-subtitle-dot">•</span>
            <span>Earn</span>
            <span className="auth-subtitle-dot">•</span>
            <span>Rank Up</span>
            <span className="auth-subtitle-dot">•</span>
            <span>Redeem</span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="auth-nav-tabs">
          <button type="button" className="auth-tab-btn active">
            <ArcadeIcon name="user" size={16} />
            <span>Sign In</span>
          </button>
          <Link to="/register" className="auth-tab-btn">
            <ArcadeIcon name="joy" size={16} />
            <span>Register</span>
          </Link>
        </div>

        {/* Main Sign-In Cabinet Card */}
        <div className="auth-card">
          <div className="auth-card-banner">
            <div className="auth-card-banner-title">
              <ArcadeIcon name="joy" size={20} />
              <span>Player Console</span>
            </div>
          </div>

          {errorMessage && (
            <div className="auth-alert-error" role="alert">
              <ArcadeIcon name="shield" size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="auth-form">
            {/* Username Input */}
            <div className="auth-field">
              <label htmlFor="login-username" className="auth-label">
                <span>Player Username</span>
              </label>
              <div className="auth-input-wrap">
                <input
                  id="login-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. lois_123xx"
                  autoComplete="username"
                  required
                  className="auth-input"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="auth-field">
              <label htmlFor="login-password" className="auth-label">
                <span>Password</span>
              </label>
              <div className="auth-input-wrap">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="auth-input"
                />
                <button
                  type="button"
                  className="auth-input-icon-btn"
                  onClick={() => setShowPassword((prev) => !prev)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <ArcadeIcon name={showPassword ? 'clock' : 'key'} size={18} />
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="auth-submit-btn"
              disabled={isLoading}
            >
              <span>{isLoading ? 'ACCESSING CONSOLE...' : 'LOGIN'}</span>
            </button>
          </form>
        </div>

        {/* Quick Demo Test Stations */}
        <div className="auth-drawer">
          <div className="auth-drawer-title">
            <span>Demo Stations (1-Click)</span>
            <span className="auth-drawer-count">Offline Ready</span>
          </div>
          <div className="auth-demo-grid">
            <button
              type="button"
              className="auth-demo-btn"
              onClick={() => handleQuickFill('lois_123xx', 'password123')}
            >
              <span className="auth-demo-badge">Player Console</span>
              <span className="auth-demo-sub">lois_123xx (Gamer)</span>
            </button>
            <button
              type="button"
              className="auth-demo-btn"
              onClick={() => handleQuickFill('admin', 'adminpassword123')}
            >
              <span className="auth-demo-badge" style={{ color: 'var(--v)' }}>Staff Admin</span>
              <span className="auth-demo-sub">admin (Full Access)</span>
            </button>
          </div>
        </div>

        {/* Feature Highlights Row using Project Assets */}
        <div className="auth-perks-row">
          <div className="auth-perk-item">
            <img src={tokenCoinImg} alt="Tokens" />
            <span className="auth-perk-text">Earn Tokens on PC Time</span>
          </div>
          <div className="auth-perk-item">
            <img src={streakImg} alt="Streaks" />
            <span className="auth-perk-text">Daily Streak Boosts</span>
          </div>
          <div className="auth-perk-item">
            <img src={prizeShopImg} alt="Rewards" />
            <span className="auth-perk-text">Claim Real Snacks & Drinks</span>
          </div>
        </div>
      </div>
    </div>
  );
};
