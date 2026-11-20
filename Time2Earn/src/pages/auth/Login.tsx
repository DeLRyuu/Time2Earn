import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { useNavigate } from 'react-router-dom';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!username.trim() || !password) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    setIsLoading(true);
    const res = await login(username, password);
    setIsLoading(false);

    if (res.success) {
      showToast(`Welcome back, ${username}!`, 'success');
      // If admin username is "admin" or user has admin role
      if (username.toLowerCase() === 'admin') {
        navigate('/admin');
      } else {
        navigate('/player');
      }
    } else {
      setErrorMessage(res.error || 'Login failed. Please check your credentials.');
      showToast(res.error || 'Authentication error', 'error');
    }
  };

  const handleQuickDemo = (demoUser: string, demoPass: string) => {
    setUsername(demoUser);
    setPassword(demoPass);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>⚡</div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '0.05em' }}>
            TIME<span style={{ color: 'var(--primary)' }}>2</span>EARN
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Play. Earn. Rank Up. Redeem.
          </p>
        </div>

        <Card variant="neon">
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {errorMessage && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid var(--danger)',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--danger)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}
              >
                {errorMessage}
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                USERNAME
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. lois_123xx"
                required
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '0.95rem',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                PASSWORD
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '0.95rem',
                  outline: 'none',
                }}
              />
            </div>

            <Button type="submit" variant="primary" size="lg" isLoading={isLoading} style={{ marginTop: '0.5rem', width: '100%' }}>
              ENTER CONSOLE
            </Button>

            <div style={{ textAlign: 'center', marginTop: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Forgot password? Request staff assistance at the shop desk.
              </span>
            </div>
          </form>
        </Card>

        {/* Quick Demo Test Credential Buttons */}
        <div style={{ marginTop: '1.25rem', padding: '0.75rem 1rem', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase' }}>
            Test Accounts (Phase 3 Validation)
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button
              variant="secondary"
              size="sm"
              style={{ flex: 1 }}
              onClick={() => handleQuickDemo('lois_123xx', 'password123')}
            >
              Player (lois)
            </Button>
            <Button
              variant="secondary"
              size="sm"
              style={{ flex: 1 }}
              onClick={() => handleQuickDemo('admin', 'adminpassword123')}
            >
              Staff Admin
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
