import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { Link, useNavigate } from 'react-router-dom';

export const Login: React.FC = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) {
      showToast('Please enter your username', 'warning');
      return;
    }
    showToast(`Welcome, ${username}! (Auth connecting in Phase 3)`, 'success');
    navigate('/player');
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
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                USERNAME
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. lois_123xx"
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

            <Button type="submit" variant="primary" size="lg" style={{ marginTop: '0.5rem', width: '100%' }}>
              ENTER CONSOLE
            </Button>

            <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Forgot credentials? Staff-assisted resets available at the counter.
              </span>
            </div>
          </form>
        </Card>

        <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
          <Link to="/player" style={{ color: 'var(--primary)', fontSize: '0.85rem', textDecoration: 'underline' }}>
            Skip directly to Player Dashboard $\rightarrow$
          </Link>
        </div>
      </div>
    </div>
  );
};
