import React from 'react';
import { RankBadge } from '../ui/RankBadge';
import { Button } from '../ui/Button';
import './RankUpCelebrationModal.css';

export interface RankUpCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  newRank: string;
  previousRank?: string;
  exp: number;
}

export const RankUpCelebrationModal: React.FC<RankUpCelebrationModalProps> = ({
  isOpen,
  onClose,
  newRank,
  previousRank,
  exp,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="celebration-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="celebration-title"
      onClick={onClose}
    >
      <div className="celebration-card" onClick={(e) => e.stopPropagation()}>
        <div className="celebration-particles" aria-hidden="true">
          <span>✨</span>
          <span>🎉</span>
          <span>⭐</span>
          <span>🏆</span>
          <span>✨</span>
        </div>

        <div className="celebration-header">
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--accent-gold)', letterSpacing: '0.1em' }}>
            RANK PROMOTION UNLOCKED
          </span>
          <h2
            id="celebration-title"
            style={{ fontSize: '1.75rem', fontWeight: 900, color: '#ffffff', margin: '0.35rem 0 0', letterSpacing: '0.02em' }}
          >
            YOU ARE NOW {newRank.toUpperCase()}!
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
            {previousRank ? `Promoted from ${previousRank}` : 'New milestone reached'} at {exp.toLocaleString()} EXP
          </p>
        </div>

        <div className="celebration-badge-wrapper">
          <div className="celebration-badge-glow" aria-hidden="true" />
          <RankBadge rank={newRank} size="lg" style={{ position: 'relative', zIndex: 1, padding: '0.65rem 1.25rem' }} />
        </div>

        <div className="perks-box">
          <div style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: '0.25rem' }}>
            🎁 Unlocked Privileges:
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            <li>Eligible for exclusive <strong>{newRank}</strong> shop redemptions</li>
            <li>Higher placement priority on seasonal Leaderboards</li>
            <li>Status badge visible on all gaming activity records</li>
          </ul>
        </div>

        <Button
          variant="primary"
          size="lg"
          onClick={onClose}
          style={{ width: '100%', fontWeight: 900, letterSpacing: '0.05em' }}
        >
          CLAIM & CONTINUE
        </Button>
      </div>
    </div>
  );
};
