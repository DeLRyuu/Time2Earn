export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  category: string;
}

export interface SanitizedQuizQuestion {
  id: string;
  question: string;
  options: string[];
  category: string;
}

export type ArcadeSessionStatus = 'active' | 'completed' | 'expired';

export interface ArcadeSession {
  id: string;
  userId: string;
  username: string;
  gameType: 'quick_quiz';
  questionIds: string[];
  status: ArcadeSessionStatus;
  startedAt: string;
  expiresAt: string;
  completedAt?: string;
  answers?: Record<string, number>;
  score?: number;
  creditsAwarded?: number;
  expAwarded?: number;
  tier?: string;
}

export interface ArcadeUserStatus {
  canPlay: boolean;
  attemptsToday: number;
  maxAttemptsPerDay: number;
  dailyCreditsEarned: number;
  dailyCreditCap: number;
  cooldownUntil: string | null;
  secondsUntilNextAttempt: number;
  isRestricted: boolean;
  restrictionReason?: string;
}

export interface ArcadeRewardResult {
  score: number;
  totalQuestions: number;
  creditsAwarded: number;
  expAwarded: number;
  tier: string;
  rawCredits: number;
  isClamped: boolean;
  newTotalCredits: number;
  newTotalExp: number;
  newRank: string;
  review: {
    questionId: string;
    question: string;
    chosenOption: string;
    correctOption: string;
    isCorrect: boolean;
    explanation: string;
  }[];
}
