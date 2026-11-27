import type { ArcadeIconName } from '../components/ui/ArcadeIcon';

export type ArcadeGameId =
  | 'time2rush'
  | 'endless-run'
  | 'zombie-run'
  | 'reaction-rush'
  | 'color-clash'
  | 'target-hunter'
  | 'ball-bounce'
  | 'keyboard-ninja';

export interface ArcadeGameDef {
  id: ArcadeGameId;
  name: string;
  tagline: string;
  icon: ArcadeIconName;
  color: string; // CSS var string, e.g. 'var(--y)'
  status: 'playable' | 'coming-soon';
  modes: string[];
  minDurationMs: number;
  maxDurationMs: number;
  maxPlausibleScore: number;
  dailyTokenCap: number;
  input: ('keyboard' | 'mouse' | 'touch')[];
}

export interface GameResult {
  gameId: ArcadeGameId;
  sessionId: string;
  mode: string;
  score: number;
  durationMs: number;
  difficulty: string;
  performance: Record<string, number>;
  clientVersion: string;
  startedAt: string;
  endedAt: string;
}

export interface RewardResult {
  tokensAwarded: number;
  expAwarded: number;
  rawTokens: number;
  clamped: 'none' | 'game-cap' | 'daily-cap';
  tierLabel: string;
  arcadeScore: number;
}
