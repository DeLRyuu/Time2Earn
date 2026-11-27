import type { ArcadeIconName } from '../../../components/ui/ArcadeIcon';

export type StroopColorId = 'red' | 'blue' | 'green' | 'yellow';

export interface StroopColorDef {
  id: StroopColorId;
  label: string;
  cssColor: string; // Theme variable or distinct neon hex
  shapeIcon: ArcadeIconName;
  keyShortcut: string; // '1' | '2' | '3' | '4'
}

export const STROOP_COLORS: StroopColorDef[] = [
  { id: 'red', label: 'RED', cssColor: 'var(--r)', shapeIcon: 'flame', keyShortcut: '1' },
  { id: 'blue', label: 'BLUE', cssColor: 'var(--s)', shapeIcon: 'bolt', keyShortcut: '2' },
  { id: 'green', label: 'GREEN', cssColor: 'var(--g)', shapeIcon: 'check', keyShortcut: '3' },
  { id: 'yellow', label: 'YELLOW', cssColor: 'var(--y)', shapeIcon: 'coin', keyShortcut: '4' },
];

export interface StroopQuestion {
  id: string;
  word: StroopColorId; // The text that is written (e.g. "RED")
  inkColor: StroopColorId; // The color it is rendered in (e.g. "green") - player must choose THIS
}

export interface ColorClashPerformance {
  correct: number;
  total: number;
  accuracy: number;
  avgTimeMs: number;
  bestCombo: number;
}

/**
 * Returns base time limit per question in milliseconds.
 * Scaling: faster timer after every 5 correct answers.
 * Initial (0-4): 2500ms
 * 5-9: 2100ms
 * 10-14: 1700ms
 * 15+: 1300ms
 */
export function getTimeLimitForProgress(correctCount: number): number {
  if (correctCount >= 15) return 1300;
  if (correctCount >= 10) return 1700;
  if (correctCount >= 5) return 2100;
  return 2500;
}

/**
 * Generates a Stroop question where word and inkColor are picked deterministically from RNG.
 * Often word !== inkColor (conflict trial), occasionally word === inkColor (congruent trial).
 */
export function generateQuestion(rng: () => number, lastQuestion?: StroopQuestion): StroopQuestion {
  const colorIds: StroopColorId[] = ['red', 'blue', 'green', 'yellow'];

  let word: StroopColorId;
  let inkColor: StroopColorId;
  let attempts = 0;

  do {
    const wordIdx = Math.floor(rng() * colorIds.length);
    word = colorIds[wordIdx];

    // 75% chance of incongruent (conflict), 25% congruent
    if (rng() < 0.75) {
      const remainingInks = colorIds.filter((c) => c !== word);
      inkColor = remainingInks[Math.floor(rng() * remainingInks.length)];
    } else {
      inkColor = word;
    }
    attempts++;
  } while (lastQuestion && lastQuestion.word === word && lastQuestion.inkColor === inkColor && attempts < 4);

  return {
    id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    word,
    inkColor,
  };
}

/**
 * Computes accuracy percentage: round(correct / total * 100).
 */
export function calculateAccuracy(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((correct / total) * 100);
}

/**
 * Computes arcade score: correct*100 + bestCombo*40 - avgTimeMs/10 (min 0).
 */
export function calculateArcadeScore(correct: number, bestCombo: number, avgTimeMs: number): number {
  const raw = correct * 100 + bestCombo * 40 - Math.round(avgTimeMs / 10);
  return Math.max(0, raw);
}
