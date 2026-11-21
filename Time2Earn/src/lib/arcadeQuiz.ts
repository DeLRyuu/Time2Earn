import type { QuizQuestion, SanitizedQuizQuestion } from '../types/arcade';

export const ARCADE_TIERS = {
  PERFECT: {
    minScore: 5,
    credits: 5,
    exp: 15,
    name: 'Flawless Victory 🏆',
    description: 'Perfect 5/5 score! Ultimate trivia master.',
  },
  HIGH: {
    minScore: 4,
    credits: 3,
    exp: 10,
    name: 'High Tier Master 🎮',
    description: '4/5 score! Veteran gamer precision.',
  },
  MID: {
    minScore: 3,
    credits: 2,
    exp: 5,
    name: 'Challenger ⚡',
    description: '3/5 score! Solid gaming fundamentals.',
  },
  LOW: {
    minScore: 2,
    credits: 1,
    exp: 2,
    name: 'Novice Contender 🎟️',
    description: '2/5 score! Good effort, keep grinding.',
  },
  PARTICIPATION: {
    minScore: 0,
    credits: 0,
    exp: 1,
    name: 'Participation 🔰',
    description: 'Learning experience! Gained +1 EXP.',
  },
};

export const QUIZ_QUESTION_BANK: QuizQuestion[] = [
  {
    id: 'q_cs_bomb',
    question: 'In Counter-Strike competitive mode, how long does the C4 bomb timer tick before exploding?',
    options: ['35 seconds', '40 seconds', '45 seconds', '50 seconds'],
    correctIndex: 1,
    explanation: 'In competitive CS:GO and CS2 matchmaking, the C4 bomb timer is exactly 40 seconds (35s in classic pro rules).',
    category: 'Counter-Strike',
  },
  {
    id: 'q_cs_defuse',
    question: 'How many seconds does it take to defuse the C4 in Counter-Strike with a Defuse Kit equipped?',
    options: ['3 seconds', '5 seconds', '7 seconds', '10 seconds'],
    correctIndex: 1,
    explanation: 'A Defuse Kit cuts the defuse time in half, from 10 seconds down to 5 seconds.',
    category: 'Counter-Strike',
  },
  {
    id: 'q_dota_roshan',
    question: 'In Dota 2, what item does Roshan ALWAYS drop on his very first death?',
    options: ["Aegis of the Immortal", "Cheese", "Refresher Shard", "Aghanim's Blessing"],
    correctIndex: 0,
    explanation: 'Roshan drops Aegis of the Immortal on his first death. Cheese only starts dropping from the second death onward.',
    category: 'Dota 2',
  },
  {
    id: 'q_dota_bkb',
    question: 'What is the minimum magic immunity duration of Black King Bar (BKB) after repeated uses in Dota 2?',
    options: ['4 seconds', '5 seconds', '6 seconds', '7 seconds'],
    correctIndex: 2,
    explanation: 'BKB duration starts at 9 seconds and decreases with each use down to a minimum duration floor of 6 seconds.',
    category: 'Dota 2',
  },
  {
    id: 'q_val_spike',
    question: 'In Valorant, how long does the Spike take to detonate after being planted?',
    options: ['35 seconds', '40 seconds', '45 seconds', '50 seconds'],
    correctIndex: 2,
    explanation: 'In Valorant, the Spike detonates exactly 45 seconds after plant.',
    category: 'Valorant',
  },
  {
    id: 'q_val_ult',
    question: 'Which Valorant agent can resurrect a fallen teammate with their Ultimate ability?',
    options: ['Skye', 'Killjoy', 'Sage', 'Viper'],
    correctIndex: 2,
    explanation: "Sage's ultimate ability 'Resurrection' revives a fallen ally with full health.",
    category: 'Valorant',
  },
  {
    id: 'q_lol_baron',
    question: 'At what game minute mark does Baron Nashor spawn on Summoner’s Rift in League of Legends?',
    options: ['15:00', '20:00', '25:00', '30:00'],
    correctIndex: 1,
    explanation: 'Baron Nashor spawns at the 20:00 minute mark, replacing the Rift Herald.',
    category: 'League of Legends',
  },
  {
    id: 'q_lol_flash',
    question: 'What is the base cooldown of the Summoner Spell Flash in League of Legends?',
    options: ['180 seconds', '240 seconds', '300 seconds', '360 seconds'],
    correctIndex: 2,
    explanation: 'Flash has a standard base cooldown of 300 seconds (5 minutes).',
    category: 'League of Legends',
  },
  {
    id: 'q_hw_ram',
    question: 'What does the computer hardware acronym "RAM" stand for?',
    options: [
      'Rapid Access Memory',
      'Random Access Memory',
      'Readily Allocated Module',
      'Remote Array Motherboard',
    ],
    correctIndex: 1,
    explanation: 'RAM stands for Random Access Memory, the high-speed temporary working memory used by the CPU.',
    category: 'Hardware',
  },
  {
    id: 'q_hw_hz',
    question: 'What refresh rate indicates that an esports monitor refreshes its screen image 240 times per second?',
    options: ['60 Hz', '144 Hz', '165 Hz', '240 Hz'],
    correctIndex: 3,
    explanation: 'Hertz (Hz) measures cycles per second; a 240 Hz monitor draws 240 frames every second.',
    category: 'Hardware',
  },
  {
    id: 'q_hw_gpu',
    question: 'Which of the following components handles real-time ray tracing and 3D polygon rendering in gaming PCs?',
    options: ['PSU (Power Supply)', 'GPU (Graphics Card)', 'SSD (Solid State Drive)', 'CMOS Battery'],
    correctIndex: 1,
    explanation: 'The GPU (Graphics Processing Unit) is responsible for calculating graphics and 3D rendering.',
    category: 'Hardware',
  },
  {
    id: 'q_retro_pacman',
    question: 'What is the maximum achievable score on a perfect game of original arcade Pac-Man?',
    options: ['999,990', '1,000,000', '3,333,360', '5,000,000'],
    correctIndex: 2,
    explanation: 'A perfect Pac-Man score is exactly 3,333,360 points, completed by Billy Mitchell in 1999.',
    category: 'Retro Gaming',
  },
  {
    id: 'q_retro_mario',
    question: 'In what year was the original Super Mario Bros. released for the Famicom / NES?',
    options: ['1981', '1983', '1985', '1988'],
    correctIndex: 2,
    explanation: 'Super Mario Bros. was released on September 13, 1985 in Japan.',
    category: 'Retro Gaming',
  },
  {
    id: 'q_shop_time2earn',
    question: 'In Time2Earn gaming shop rules, what must a player submit after finishing their PC session?',
    options: ['A selfie at the desk', 'A session claim request with unit ID and receipt', 'Their Steam password', 'A discord call link'],
    correctIndex: 1,
    explanation: 'Players submit their PC unit ID and amount paid for staff verification and credit reward.',
    category: 'Shop Rules',
  },
  {
    id: 'q_shop_cooldown',
    question: 'Why do reward redemptions and arcade plays feature cooldown timers?',
    options: ['To conserve shop electricity', 'To maintain a fair economy and prevent automated farming', 'To restart the router', 'To test your patience'],
    correctIndex: 1,
    explanation: 'Cooldowns and daily caps protect the shop economy from scripted exploitation and botting.',
    category: 'Shop Rules',
  },
  {
    id: 'q_val_creds',
    question: 'What is the maximum amount of Credits an agent can hold in a standard Valorant match?',
    options: ['5,000', '9,000', '12,000', '16,000'],
    correctIndex: 1,
    explanation: 'Valorant hard-caps credits at 9,000 creds maximum.',
    category: 'Valorant',
  },
  {
    id: 'q_cs_awp',
    question: 'In Counter-Strike, what is the default kill reward for eliminating an opponent with an AWP in competitive?',
    options: ['$100', '$300', '$600', '$900'],
    correctIndex: 0,
    explanation: 'The AWP grants a reduced kill reward of only $100 due to its one-shot lethal firepower.',
    category: 'Counter-Strike',
  },
  {
    id: 'q_dota_courier',
    question: 'In modern Dota 2, how many couriers does each team get at the start of the match?',
    options: ['1 shared courier', '2 couriers', '5 individual couriers', 'None until purchased'],
    correctIndex: 2,
    explanation: 'Each player receives their own personal automated courier from the start of the game.',
    category: 'Dota 2',
  },
  {
    id: 'q_hw_nvme',
    question: 'Which interface allows modern NVMe M.2 solid-state drives to achieve ultra-fast read/write speeds exceeding 5,000 MB/s?',
    options: ['PCIe (PCI Express)', 'SATA III', 'USB 2.0', 'VGA'],
    correctIndex: 0,
    explanation: 'NVMe SSDs communicate directly over high-speed PCIe lanes.',
    category: 'Hardware',
  },
  {
    id: 'q_lol_smite',
    question: 'In League of Legends, which summoner spell is essential for Junglers to secure neutral monster objectives like Dragon and Baron?',
    options: ['Ignite', 'Teleport', 'Smite', 'Exhaust'],
    correctIndex: 2,
    explanation: 'Smite deals direct true damage to monsters and minions, essential for securing objective finishes.',
    category: 'League of Legends',
  },
];

/**
 * Sanitizes a quiz question by stripping correct answer index and explanation.
 * Safe for transmission to client.
 */
export function sanitizeQuestion(q: QuizQuestion): SanitizedQuizQuestion {
  return {
    id: q.id,
    question: q.question,
    options: [...q.options],
    category: q.category,
  };
}

/**
 * Randomly picks N distinct questions from the question bank.
 */
export function getRandomQuestions(count = 5): QuizQuestion[] {
  const shuffled = [...QUIZ_QUESTION_BANK].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Authoritative grading of submitted answers against the question bank.
 * Client has zero influence on the score.
 */
export function gradeQuiz(
  questionIds: string[],
  submittedAnswers: Record<string, number>
): {
  score: number;
  total: number;
  results: {
    questionId: string;
    question: string;
    chosenIndex: number;
    correctIndex: number;
    chosenOption: string;
    correctOption: string;
    isCorrect: boolean;
    explanation: string;
  }[];
} {
  const map = new Map<string, QuizQuestion>(QUIZ_QUESTION_BANK.map((q) => [q.id, q]));
  let score = 0;
  const results = [];

  for (const qid of questionIds) {
    const q = map.get(qid);
    if (!q) continue;

    const chosenIndex = submittedAnswers[qid] ?? -1;
    const isCorrect = chosenIndex === q.correctIndex;
    if (isCorrect) {
      score += 1;
    }

    results.push({
      questionId: q.id,
      question: q.question,
      chosenIndex,
      correctIndex: q.correctIndex,
      chosenOption: chosenIndex >= 0 && chosenIndex < q.options.length ? q.options[chosenIndex] : 'No answer',
      correctOption: q.options[q.correctIndex],
      isCorrect,
      explanation: q.explanation,
    });
  }

  return {
    score,
    total: questionIds.length,
    results,
  };
}

/**
 * Computes authoritative rewards for a score and clamps to the daily credit cap.
 */
export function calculateArcadeRewards(
  score: number,
  dailyCreditsEarned: number,
  dailyCap = 10
): {
  creditsAwarded: number;
  expAwarded: number;
  tier: string;
  rawCredits: number;
  isClamped: boolean;
} {
  let tierMeta: typeof ARCADE_TIERS.PARTICIPATION;

  if (score >= ARCADE_TIERS.PERFECT.minScore) {
    tierMeta = ARCADE_TIERS.PERFECT;
  } else if (score >= ARCADE_TIERS.HIGH.minScore) {
    tierMeta = ARCADE_TIERS.HIGH;
  } else if (score >= ARCADE_TIERS.MID.minScore) {
    tierMeta = ARCADE_TIERS.MID;
  } else if (score >= ARCADE_TIERS.LOW.minScore) {
    tierMeta = ARCADE_TIERS.LOW;
  } else {
    tierMeta = ARCADE_TIERS.PARTICIPATION;
  }

  const rawCredits = tierMeta.credits;
  const remainingAllowance = Math.max(0, dailyCap - dailyCreditsEarned);
  const creditsAwarded = Math.min(rawCredits, remainingAllowance);
  const isClamped = rawCredits > creditsAwarded;

  return {
    creditsAwarded,
    expAwarded: tierMeta.exp,
    tier: tierMeta.name,
    rawCredits,
    isClamped,
  };
}
