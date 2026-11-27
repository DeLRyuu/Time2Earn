import React from 'react';
import { ArcadeIcon } from '../../components/ui/ArcadeIcon';
import type { RewardResult } from '../types';

export interface ArcadeResultModalProps {
  result: RewardResult;
  onPlayAgain: () => void;
  onBackToLobby: () => void;
}

export const ArcadeResultModal: React.FC<ArcadeResultModalProps> = ({
  result,
  onPlayAgain,
  onBackToLobby,
}) => {
  const isClamped = result.clamped !== 'none';

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card" style={{ maxWidth: '460px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--y)' }}>
          <ArcadeIcon
            name={result.arcadeScore >= 500 ? 'trophy' : 'gamepad'}
            size={56}
          />
        </div>

        <h2>{result.tierLabel || 'Round Finished'}</h2>

        <div className="modal-summary" style={{ padding: '16px' }}>
          <div className="modal-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontWeight: 700, color: 'var(--mute)' }}>Final score</span>
            <b style={{ fontFamily: 'Lilita One', fontSize: '20px', color: 'var(--ink)' }}>
              {result.arcadeScore.toLocaleString()}
            </b>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '10px' }}>
            <span
              className="reward-pill tokens"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '99px',
                background: 'var(--y)',
                color: 'var(--on)',
                fontFamily: 'Lilita One',
                fontSize: '18px',
                border: '2px solid var(--line)',
              }}
            >
              +{result.tokensAwarded} tokens
            </span>

            <span
              className="reward-pill exp"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '99px',
                background: 'var(--v)',
                color: 'var(--on)',
                fontFamily: 'Lilita One',
                fontSize: '18px',
                border: '2px solid var(--line)',
              }}
            >
              +{result.expAwarded} EXP
            </span>
          </div>

          {isClamped && (
            <div
              className="arcade-notes"
              style={{
                marginTop: '14px',
                background: 'rgba(255, 201, 60, 0.1)',
                borderColor: 'var(--y)',
                color: 'var(--y)',
                textAlign: 'left',
                fontSize: '13px',
                padding: '10px 14px',
              }}
            >
              <strong>Daily token cap reached.</strong> You can keep playing for score and leaderboard ranking! Score and EXP still count toward your profile.
            </div>
          )}
        </div>

        <div className="modal-actions" style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
          <button
            type="button"
            className="game-btn"
            style={{ background: 'var(--panel2)', color: 'var(--ink)', flex: 1 }}
            onClick={onBackToLobby}
          >
            Back to lobby
          </button>
          <button
            type="button"
            className="game-btn"
            style={{ flex: 1 }}
            onClick={onPlayAgain}
          >
            Play again
          </button>
        </div>
      </div>
    </div>
  );
};
