import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { saveRegisteredUser } from './authRegistration';
import { ArcadeIcon } from '../../components/ui/ArcadeIcon';
import webIconImg from '../../assets/sidebar/web-icon.png';
import tokenCoinImg from '../../assets/token/token-coin.png';
import streakImg from '../../assets/streak/streak.png';
import rankingImg from '../../assets/sidebar/ranking.png';
import './AuthPages.css';

export interface RegisterPayload {
  username: string;
  password: string;
  birthday: string;
  gender: 'male' | 'female' | 'other';
}

export const Register: React.FC = () => {
  const { showToast } = useToast();
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [birthday, setBirthday] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Today's date ISO format for date picker max attribute
  const todayStr = new Date().toISOString().split('T')[0];

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanUsername = username.trim();

    // Client-side validations
    if (!cleanUsername) {
      setErrorMessage('Please enter a username.');
      return;
    }
    if (cleanUsername.length < 3) {
      setErrorMessage('Username must be at least 3 characters.');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
      setErrorMessage('Username may only contain letters, numbers, and underscores.');
      return;
    }
    if (!birthday) {
      setErrorMessage('Please select your birthday.');
      return;
    }
    if (birthday > todayStr) {
      setErrorMessage('Birthday cannot be in the future.');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await saveRegisteredUser({
        username: cleanUsername,
        password,
        birthday,
        gender,
      });

      if (!res.success) {
        setIsLoading(false);
        setErrorMessage(res.error || 'Registration failed.');
        showToast(res.error || 'Registration failed', 'error');
        return;
      }

      // Automatically authenticate the newly registered player
      const loginRes = await login(cleanUsername, password);
      setIsLoading(false);

      if (loginRes.success) {
        showToast(`Welcome to Time2Earn Arcade, ${cleanUsername}!`, 'success');
        navigate('/player');
      } else {
        showToast(`Account created for ${cleanUsername}! Please sign in.`, 'success');
        navigate('/login');
      }
    } catch (err) {
      setIsLoading(false);
      const msg = err instanceof Error ? err.message : 'Registration error occurred.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    }
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
          <Link to="/login" className="auth-tab-btn">
            <ArcadeIcon name="user" size={16} />
            <span>Sign In</span>
          </Link>
          <button type="button" className="auth-tab-btn active">
            <ArcadeIcon name="joy" size={16} />
            <span>Register</span>
          </button>
        </div>

        {/* Main Registration Cabinet Card */}
        <div className="auth-card">
          <div className="auth-card-banner">
            <div className="auth-card-banner-title">
              <ArcadeIcon name="user" size={20} />
              <span>Create Player Card</span>
            </div>
          </div>

          {errorMessage && (
            <div className="auth-alert-error" role="alert">
              <ArcadeIcon name="shield" size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="auth-form">
            {/* Username Input */}
            <div className="auth-field">
              <label htmlFor="reg-username" className="auth-label">
                <span>Player Username</span>
              </label>
              <div className="auth-input-wrap">
                <input
                  id="reg-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. cyber_ninja99"
                  autoComplete="username"
                  maxLength={20}
                  required
                  className="auth-input"
                />
              </div>
            </div>

            {/* Birthday Input */}
            <div className="auth-field">
              <label htmlFor="reg-birthday" className="auth-label">
                <span>Birthday</span>
              </label>
              <div className="auth-input-wrap">
                <input
                  id="reg-birthday"
                  type="date"
                  max={todayStr}
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  required
                  className="auth-input"
                />
              </div>
            </div>

            {/* Gender Selection */}
            <div className="auth-field">
              <span className="auth-label">Gender</span>
              <div className="auth-gender-grid">
                <button
                  type="button"
                  className={`auth-gender-btn ${gender === 'male' ? 'active' : ''}`}
                  onClick={() => setGender('male')}
                >
                  <span>👦 Male</span>
                </button>
                <button
                  type="button"
                  className={`auth-gender-btn ${gender === 'female' ? 'active' : ''}`}
                  onClick={() => setGender('female')}
                >
                  <span>👧 Female</span>
                </button>
              </div>
            </div>

            {/* Password Input */}
            <div className="auth-field">
              <label htmlFor="reg-password" className="auth-label">
                <span>Password</span>
                <span className="auth-label-hint">Min 6 characters</span>
              </label>
              <div className="auth-input-wrap">
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
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

            {/* Confirm Password Input */}
            <div className="auth-field">
              <label htmlFor="reg-confirm-password" className="auth-label">
                <span>Confirm Password</span>
              </label>
              <div className="auth-input-wrap">
                <input
                  id="reg-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                  className="auth-input"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="auth-submit-btn"
              disabled={isLoading}
            >
              <span>{isLoading ? 'CREATING PLAYER CARD...' : 'REGISTER'}</span>
            </button>
          </form>
        </div>

        {/* Feature Highlights Row using Project Assets */}
        <div className="auth-perks-row">
          <div className="auth-perk-item">
            <img src={tokenCoinImg} alt="Tokens" />
            <span className="auth-perk-text">Earn Tokens on Every Peso</span>
          </div>
          <div className="auth-perk-item">
            <img src={streakImg} alt="Streaks" />
            <span className="auth-perk-text">Daily Login Streak Multiplier</span>
          </div>
          <div className="auth-perk-item">
            <img src={rankingImg} alt="Ranks" />
            <span className="auth-perk-text">Climb Leaderboard to OG</span>
          </div>
        </div>
      </div>
    </div>
  );
};
