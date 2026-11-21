import {
  getArcadeUserStatus,
  startArcadeSession,
  submitArcadeSession,
  saveLocalArcadeSessions,
  MAX_ATTEMPTS_PER_DAY,
  DAILY_CREDIT_CAP,
} from './arcadeService';
import {
  calculateArcadeRewards,
  gradeQuiz,
  sanitizeQuestion,
  QUIZ_QUESTION_BANK,
} from '../lib/arcadeQuiz';
import type { AuthUser } from '../types/auth';

export async function runArcadeTests(): Promise<boolean> {
  const assertions: Array<{ name: string; pass: boolean; expected?: unknown; actual?: unknown }> = [];

  function assertEqual(name: string, actual: unknown, expected: unknown) {
    const pass = JSON.stringify(actual) === JSON.stringify(expected);
    assertions.push({ name, pass, expected, actual });
    if (!pass) {
      console.error(`FAIL: ${name} -> expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    } else {
      console.log(`PASS: ${name}`);
    }
  }

  function assertTrue(name: string, condition: boolean) {
    assertions.push({ name, pass: condition });
    if (!condition) {
      console.error(`FAIL: ${name}`);
    } else {
      console.log(`PASS: ${name}`);
    }
  }

  console.log('\n--- Running Phase 14: Arcade Economy & Anti-Cheat Tests ---');

  // Clear local storage test data before testing
  saveLocalArcadeSessions([]);

  const testUser: AuthUser = {
    uid: 'test_player_01',
    username: 'arcadegamer',
    role: 'user',
    credits: 100,
    exp: 500,
    rank: 'Gamer',
    isRestricted: false,
    isBanned: false,
  };

  const baseDate = new Date('2026-11-21T10:00:00.000Z');

  // Test 1: Reward Tier Calculations (Zero prior earnings)
  const tier5 = calculateArcadeRewards(5, 0, DAILY_CREDIT_CAP);
  assertEqual('Tier 5/5 Credits', tier5.creditsAwarded, 5);
  assertEqual('Tier 5/5 EXP', tier5.expAwarded, 15);
  assertEqual('Tier 5/5 Clamped', tier5.isClamped, false);

  const tier4 = calculateArcadeRewards(4, 0, DAILY_CREDIT_CAP);
  assertEqual('Tier 4/5 Credits', tier4.creditsAwarded, 3);
  assertEqual('Tier 4/5 EXP', tier4.expAwarded, 10);

  const tier3 = calculateArcadeRewards(3, 0, DAILY_CREDIT_CAP);
  assertEqual('Tier 3/5 Credits', tier3.creditsAwarded, 2);
  assertEqual('Tier 3/5 EXP', tier3.expAwarded, 5);

  const tier2 = calculateArcadeRewards(2, 0, DAILY_CREDIT_CAP);
  assertEqual('Tier 2/5 Credits', tier2.creditsAwarded, 1);
  assertEqual('Tier 2/5 EXP', tier2.expAwarded, 2);

  const tier0 = calculateArcadeRewards(0, 0, DAILY_CREDIT_CAP);
  assertEqual('Tier 0/5 Credits', tier0.creditsAwarded, 0);
  assertEqual('Tier 0/5 EXP', tier0.expAwarded, 1);

  // Test 2: Daily Credit Cap Clamping
  // Already earned 8 Credits today, scored 5/5 (normally 5 CR) -> only 2 CR awarded
  const clampedTier = calculateArcadeRewards(5, 8, DAILY_CREDIT_CAP);
  assertEqual('Clamped credits when daily earned is 8', clampedTier.creditsAwarded, 2);
  assertEqual('Clamped flag is true', clampedTier.isClamped, true);
  assertEqual('EXP remains full +15 even when credits are clamped', clampedTier.expAwarded, 15);

  // Already reached daily cap (10 CR earned)
  const fullyCappedTier = calculateArcadeRewards(5, 10, DAILY_CREDIT_CAP);
  assertEqual('0 Credits awarded when daily cap of 10 is reached', fullyCappedTier.creditsAwarded, 0);
  assertEqual('Clamped flag is true on max cap', fullyCappedTier.isClamped, true);
  assertEqual('EXP still awarded on max cap', fullyCappedTier.expAwarded, 15);

  // Test 3: Client Question Sanitization (No Answers Leaked)
  const rawQ = QUIZ_QUESTION_BANK[0];
  const sanitized = sanitizeQuestion(rawQ);
  assertEqual('Sanitized question ID preserved', sanitized.id, rawQ.id);
  assertEqual('Sanitized question text preserved', sanitized.question, rawQ.question);
  assertEqual('Sanitized question options length preserved', sanitized.options.length, 4);
  assertTrue('Sanitized question DOES NOT have correctIndex', !('correctIndex' in sanitized));
  assertTrue('Sanitized question DOES NOT have explanation', !('explanation' in sanitized));

  // Test 4: Authoritative Grading
  const sampleQIds = [QUIZ_QUESTION_BANK[0].id, QUIZ_QUESTION_BANK[1].id];
  const perfectAnswers = {
    [sampleQIds[0]]: QUIZ_QUESTION_BANK[0].correctIndex,
    [sampleQIds[1]]: QUIZ_QUESTION_BANK[1].correctIndex,
  };
  const gradeResult = gradeQuiz(sampleQIds, perfectAnswers);
  assertEqual('Grade result for perfect answers', gradeResult.score, 2);

  const wrongAnswers = {
    [sampleQIds[0]]: (QUIZ_QUESTION_BANK[0].correctIndex + 1) % 4,
    [sampleQIds[1]]: QUIZ_QUESTION_BANK[1].correctIndex,
  };
  const gradeResult2 = gradeQuiz(sampleQIds, wrongAnswers);
  assertEqual('Grade result for 1 wrong answer', gradeResult2.score, 1);

  // Test 5: Fresh User Status (No attempts today)
  const initialStatus = await getArcadeUserStatus(testUser, baseDate);
  assertEqual('Initial canPlay is true', initialStatus.canPlay, true);
  assertEqual('Initial attemptsToday is 0', initialStatus.attemptsToday, 0);
  assertEqual('Initial maxAttemptsPerDay is 3', initialStatus.maxAttemptsPerDay, MAX_ATTEMPTS_PER_DAY);
  assertEqual('Initial secondsUntilNextAttempt is 0', initialStatus.secondsUntilNextAttempt, 0);

  // Test 6: Restricted User Lockout
  const restrictedUser: AuthUser = { ...testUser, uid: 'restricted_guy', isRestricted: true };
  const restrictedStatus = await getArcadeUserStatus(restrictedUser, baseDate);
  assertEqual('Restricted user cannot play', restrictedStatus.canPlay, false);
  assertEqual('Restricted flag is true', restrictedStatus.isRestricted, true);

  let restrictedBlocked = false;
  try {
    await startArcadeSession(restrictedUser, baseDate);
  } catch (err: unknown) {
    restrictedBlocked = true;
    assertTrue('Blocked restricted user with message', (err as Error).message.includes('debt'));
  }
  assertTrue('Restricted user was prevented from starting a session', restrictedBlocked);

  // Test 7: Start Session & Anti-Bot Protection
  const session1 = await startArcadeSession(testUser, baseDate);
  assertTrue('Session created with valid ID', session1.sessionId.startsWith('arc_'));
  assertEqual('Session gives exactly 5 sanitized questions', session1.questions.length, 5);

  // Anti-bot duration gate: Submitting after only 2 seconds (< 10s gate) should throw
  const tooFastTime = new Date(baseDate.getTime() + 2000);
  let tooFastRejected = false;
  try {
    await submitArcadeSession(testUser, session1.sessionId, {}, tooFastTime);
  } catch (err: unknown) {
    tooFastRejected = true;
    assertTrue('Anti-bot error message returned', (err as Error).message.includes('quickly'));
  }
  assertTrue('Submission under 10 seconds was rejected', tooFastRejected);

  // Valid submission time (15 seconds elapsed)
  const validSubmitTime1 = new Date(baseDate.getTime() + 15000);
  // Prepare all correct answers for the session's questions
  const answers1: Record<string, number> = {};
  for (const q of session1.questions) {
    const raw = QUIZ_QUESTION_BANK.find((x) => x.id === q.id);
    if (raw) answers1[q.id] = raw.correctIndex;
  }

  const result1 = await submitArcadeSession(testUser, session1.sessionId, answers1, validSubmitTime1);
  assertEqual('Attempt 1 score is 5', result1.score, 5);
  assertEqual('Attempt 1 credits awarded is 5', result1.creditsAwarded, 5);
  assertEqual('Attempt 1 EXP awarded is 15', result1.expAwarded, 15);
  assertEqual('Attempt 1 new total credits', result1.newTotalCredits, 105);

  // Test 8: Anti-Replay Attack Prevention
  let replayRejected = false;
  try {
    await submitArcadeSession(testUser, session1.sessionId, answers1, new Date(validSubmitTime1.getTime() + 5000));
  } catch (err: unknown) {
    replayRejected = true;
    assertTrue('Replay rejection message', (err as Error).message.includes('completed'));
  }
  assertTrue('Replay of completed session was strictly rejected', replayRejected);

  // Test 9: Cooldown Enforcement (15 Minutes)
  // Check user status 5 minutes after attempt 1
  const fiveMinLater = new Date(validSubmitTime1.getTime() + 5 * 60 * 1000);
  const cooldownStatus = await getArcadeUserStatus(testUser, fiveMinLater);
  assertEqual('Cannot play during cooldown', cooldownStatus.canPlay, false);
  assertEqual('Attempts today is 1', cooldownStatus.attemptsToday, 1);
  assertTrue('Remaining seconds reflects remaining cooldown', cooldownStatus.secondsUntilNextAttempt > 0);

  let cooldownBlocked = false;
  try {
    await startArcadeSession(testUser, fiveMinLater);
  } catch (err: unknown) {
    cooldownBlocked = true;
    assertTrue('Cooldown block message returned', (err as Error).message.includes('cooling down'));
  }
  assertTrue('Starting session during cooldown was blocked', cooldownBlocked);

  // Test 10: After Cooldown Expires (16 Minutes After Attempt 1)
  const sixteenMinLater = new Date(validSubmitTime1.getTime() + 16 * 60 * 1000);
  const readyStatus = await getArcadeUserStatus(testUser, sixteenMinLater);
  assertEqual('Can play after cooldown expires', readyStatus.canPlay, true);
  assertEqual('Attempts today is 1', readyStatus.attemptsToday, 1);
  assertEqual('Daily credits earned is 5', readyStatus.dailyCreditsEarned, 5);

  // Attempt 2: Score 5/5 again, but daily cap is 10 and we already have 5 CR
  const session2 = await startArcadeSession(testUser, sixteenMinLater);
  const answers2: Record<string, number> = {};
  for (const q of session2.questions) {
    const raw = QUIZ_QUESTION_BANK.find((x) => x.id === q.id);
    if (raw) answers2[q.id] = raw.correctIndex;
  }
  const submitTime2 = new Date(sixteenMinLater.getTime() + 20000);
  const result2 = await submitArcadeSession(testUser, session2.sessionId, answers2, submitTime2);
  assertEqual('Attempt 2 score is 5', result2.score, 5);
  assertEqual('Attempt 2 credits awarded is 5 (5 + 5 = 10 cap hit)', result2.creditsAwarded, 5);

  // Attempt 3: 16 minutes after attempt 2. Daily credits earned is now 10 (cap hit!)
  const thirtyTwoMinLater = new Date(submitTime2.getTime() + 16 * 60 * 1000);
  const statusBefore3 = await getArcadeUserStatus(testUser, thirtyTwoMinLater);
  assertEqual('Can play attempt 3', statusBefore3.canPlay, true);
  assertEqual('Attempts today is 2', statusBefore3.attemptsToday, 2);
  assertEqual('Daily credits earned is 10 (cap)', statusBefore3.dailyCreditsEarned, 10);

  const session3 = await startArcadeSession(testUser, thirtyTwoMinLater);
  const answers3: Record<string, number> = {};
  for (const q of session3.questions) {
    const raw = QUIZ_QUESTION_BANK.find((x) => x.id === q.id);
    if (raw) answers3[q.id] = raw.correctIndex;
  }
  const submitTime3 = new Date(thirtyTwoMinLater.getTime() + 25000);
  const result3 = await submitArcadeSession(testUser, session3.sessionId, answers3, submitTime3);
  assertEqual('Attempt 3 score is 5', result3.score, 5);
  assertEqual('Attempt 3 credits awarded is 0 because 10 CR daily cap is exhausted', result3.creditsAwarded, 0);
  assertEqual('Attempt 3 EXP is still +15', result3.expAwarded, 15);
  assertEqual('Attempt 3 clamped flag is true', result3.isClamped, true);

  // Test 11: Daily Attempts Limit (3/3 Used)
  const afterThreeAttemptsTime = new Date(submitTime3.getTime() + 16 * 60 * 1000);
  const finalStatus = await getArcadeUserStatus(testUser, afterThreeAttemptsTime);
  assertEqual('Cannot play after 3/3 attempts used', finalStatus.canPlay, false);
  assertEqual('Attempts today is 3', finalStatus.attemptsToday, 3);

  let fourthAttemptBlocked = false;
  try {
    await startArcadeSession(testUser, afterThreeAttemptsTime);
  } catch (err: unknown) {
    fourthAttemptBlocked = true;
    assertTrue('Max attempts message returned', (err as Error).message.includes('Daily limit reached'));
  }
  assertTrue('Fourth attempt in single day was blocked', fourthAttemptBlocked);

  // Test 12: Session Expiration (> 3 minutes)
  const sessionExp = {
    id: 'arc_expired_01',
    userId: testUser.uid,
    username: testUser.username,
    gameType: 'quick_quiz' as const,
    questionIds: sampleQIds,
    status: 'active' as const,
    startedAt: baseDate.toISOString(),
    expiresAt: new Date(baseDate.getTime() + 3 * 60 * 1000).toISOString(),
  };
  const allSessions = [sessionExp];
  saveLocalArcadeSessions(allSessions);

  const lateSubmitTime = new Date(baseDate.getTime() + 4 * 60 * 1000); // 4 minutes later
  let expiredRejected = false;
  try {
    await submitArcadeSession(testUser, sessionExp.id, {}, lateSubmitTime);
  } catch (err: unknown) {
    expiredRejected = true;
    assertTrue('Expiration message returned', (err as Error).message.includes('expired'));
  }
  assertTrue('Expired session submission was rejected', expiredRejected);

  // Summary
  const allPassed = assertions.every((a) => a.pass);
  console.log(`\nPhase 14 Test Suite Completed: ${assertions.filter((a) => a.pass).length}/${assertions.length} assertions passed.`);
  return allPassed;
}
