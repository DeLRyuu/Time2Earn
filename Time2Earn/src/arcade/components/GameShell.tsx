import React, { Component, type ReactNode, type ErrorInfo } from 'react';
import { ArcadeIcon } from '../../components/ui/ArcadeIcon';
import type { ArcadeGameDef } from '../types';
import { SHARED_DAILY_TOKEN_CAP } from '../registry';
import './GameShell.css';

interface ErrorBoundaryProps {
  children: ReactNode;
  onReset: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class GameErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Game execution crashed:', error, errorInfo);
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="game-shell-error">
          <ArcadeIcon name="bolt" size={48} style={{ color: 'var(--r)' }} />
          <h3>Cabinet Malfunction</h3>
          <p>
            An unexpected error occurred in this game cabinet. Your scores, tokens, and EXP
            remain safe.
          </p>
          <button
            type="button"
            className="game-btn"
            style={{ width: 'auto', background: 'var(--panel2)', color: 'var(--ink)' }}
            onClick={this.props.onReset}
          >
            Return to lobby
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export interface GameShellProps {
  game: ArcadeGameDef;
  onBack: () => void;
  tokensEarnedTodayAll: number;
  tokensEarnedTodayGame: number;
  children: ReactNode;
}

export const GameShell: React.FC<GameShellProps> = ({
  game,
  onBack,
  tokensEarnedTodayAll,
  tokensEarnedTodayGame,
  children,
}) => {
  const sharedTokensLeft = Math.max(0, SHARED_DAILY_TOKEN_CAP - tokensEarnedTodayAll);
  const gameTokensLeft = Math.max(0, game.dailyTokenCap - tokensEarnedTodayGame);

  return (
    <div className="game-shell-view">
      {/* Shell Header */}
      <div className="game-shell-head">
        <div className="game-shell-left">
          <button
            type="button"
            className="game-btn"
            style={{ width: 'auto', padding: '8px 14px', fontSize: '15px' }}
            onClick={onBack}
            aria-label="Back to Arcade lobby"
          >
            <ArcadeIcon name="home" size={18} />
            <span>Lobby</span>
          </button>

          <div className="game-shell-title">
            <h2>{game.name}</h2>
            <span className="game-shell-tagline">{game.tagline}</span>
          </div>
        </div>

        {/* Caps Bar */}
        <div className="game-shell-caps">
          {/* Game Daily Cap */}
          <div className="game-shell-stat">
            <span className="game-shell-stat-label">Game tokens left</span>
            <span className="game-shell-stat-val">
              {gameTokensLeft} / {game.dailyTokenCap}
            </span>
            <div className="hud-bar" style={{ height: '8px', margin: 0 }}>
              <div
                className="hud-bar-fill mint"
                style={{
                  width: `${Math.min(100, (tokensEarnedTodayGame / game.dailyTokenCap) * 100)}%`,
                }}
              />
            </div>
          </div>

          {/* Shared 50 Daily Cap */}
          <div className="game-shell-stat">
            <span className="game-shell-stat-label">Arcade tokens left</span>
            <span className="game-shell-stat-val">
              {sharedTokensLeft} / {SHARED_DAILY_TOKEN_CAP}
            </span>
            <div className="hud-bar" style={{ height: '8px', margin: 0 }}>
              <div
                className="hud-bar-fill"
                style={{
                  width: `${Math.min(100, (tokensEarnedTodayAll / SHARED_DAILY_TOKEN_CAP) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Game Slot with Error Boundary */}
      <div className="game-shell-body">
        <GameErrorBoundary onReset={onBack}>{children}</GameErrorBoundary>
      </div>
    </div>
  );
};
