import type { RecordedInput } from '../../engine/runner/runnerCore';
import { hashSeed } from '../../engine/seededRng';

export type Time2RushMode = 'time-trial' | 'token-run';

export interface Time2RushGhostRecord {
  dateKey: string;
  finishTimeMs: number;
  inputs: RecordedInput[];
  mode: Time2RushMode;
}

export interface Time2RushPerformance {
  finishTimeMs: number;
  pickupsScore: number;
  tokenPickups: number;
  collisions: number;
  completed: boolean;
  trackLengthM: number;
  trackRecordMs?: number;
}

/**
 * Typed placeholder for Phase J race placement rewards.
 * 1st: 10, 2nd: 7, 3rd: 5, 4th: 3 tokens.
 */
export interface RacePlacementRewardPlaceholder {
  placement: 1 | 2 | 3 | 4;
  tokens: 10 | 7 | 5 | 3;
}

export const TIME2RUSH_CONFIG = {
  TRACK_LENGTH_M: 1000, // ~60-70 seconds at base 14-18 m/s
  MAX_SPEED: 26.0, // m/s
  BASE_SPEED: 14.0, // m/s
  DAILY_KEY_PREFIX: 't2r_daily_',
  GHOST_KEY_PREFIX: 't2r_ghost_',
  PERSONAL_BEST_KEY_PREFIX: 't2r_pb_',
};

/**
 * Returns today's daily date key (YYYY-MM-DD in UTC).
 */
export function getDailyTrackKey(): string {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

/**
 * Generates daily integer seed from date string.
 */
export function getDailySeed(dateKey: string = getDailyTrackKey()): number {
  return hashSeed(`time2rush_daily_${dateKey}`);
}

/**
 * Calculates theoretical minimum completion time for track.
 */
export function getTheoreticalMinimumTimeMs(trackLengthM: number = TIME2RUSH_CONFIG.TRACK_LENGTH_M): number {
  return (trackLengthM / TIME2RUSH_CONFIG.MAX_SPEED) * 1000;
}

/**
 * Retrieves stored ghost run from localStorage for a dateKey and mode.
 */
export function getStoredGhost(dateKey: string, mode: Time2RushMode): Time2RushGhostRecord | null {
  try {
    const raw = localStorage.getItem(`${TIME2RUSH_CONFIG.GHOST_KEY_PREFIX}${mode}_${dateKey}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Saves ghost run if it beat previous or is first.
 */
export function saveGhostRun(record: Time2RushGhostRecord): void {
  try {
    const existing = getStoredGhost(record.dateKey, record.mode);
    if (!existing || record.finishTimeMs < existing.finishTimeMs) {
      localStorage.setItem(
        `${TIME2RUSH_CONFIG.GHOST_KEY_PREFIX}${record.mode}_${record.dateKey}`,
        JSON.stringify(record)
      );
    }
  } catch {
    // ignore
  }
}

/**
 * Retrieves personal best finish time in ms.
 */
export function getPersonalBestTime(dateKey: string, mode: Time2RushMode): number | null {
  try {
    const val = localStorage.getItem(`${TIME2RUSH_CONFIG.PERSONAL_BEST_KEY_PREFIX}${mode}_${dateKey}`);
    return val ? Number(val) : null;
  } catch {
    return null;
  }
}

/**
 * Saves personal best finish time.
 */
export function savePersonalBestTime(dateKey: string, mode: Time2RushMode, timeMs: number): void {
  try {
    const existing = getPersonalBestTime(dateKey, mode);
    if (existing === null || timeMs < existing) {
      localStorage.setItem(`${TIME2RUSH_CONFIG.PERSONAL_BEST_KEY_PREFIX}${mode}_${dateKey}`, String(timeMs));
    }
  } catch {
    // ignore
  }
}
