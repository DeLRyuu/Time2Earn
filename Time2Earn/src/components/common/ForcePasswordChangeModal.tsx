import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';

export const ForcePasswordChangeModal: React.FC = () => {
  const { user, updatePassword } = useAuth();
  const { showToast } = useToast();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user?.mustChangePassword) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    const res = await updatePassword(newPassword);
    setIsSubmitting(false);

    if (res.success) {
      showToast('Password updated successfully! Welcome to Time2Earn.', 'success');
    } else {
      setError(res.error || 'Failed to update password.');
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={() => {}} // Non-dismissible
      title="PASSWORD RESET REQUIRED"
      size="sm"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          A staff-assisted reset was performed on your account. Please set a new private password before accessing your dashboard.
        </p>

        {error && (
          <div style={{ color: 'var(--danger)', fontSize: '0.85rem', fontWeight: 600 }}>
            {error}
          </div>
        )}

        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
            NEW PASSWORD (MIN 6 CHARACTERS)
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
            required
            style={{
              width: '100%',
              padding: '0.65rem 0.85rem',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
            CONFIRM NEW PASSWORD
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            required
            style={{
              width: '100%',
              padding: '0.65rem 0.85rem',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
        </div>

        <Button type="submit" variant="primary" size="md" isLoading={isSubmitting} style={{ marginTop: '0.5rem' }}>
          CONFIRM AND CONTINUE
        </Button>
      </form>
    </Modal>
  );
};
