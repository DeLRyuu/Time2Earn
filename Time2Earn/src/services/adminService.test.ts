import { adjustPlayerCredits } from './adminService';
import type { AuthUser } from '../types/auth';

export function runAdminServiceTests() {
  const assertions: Array<{ name: string; pass: boolean; expected: unknown; actual: unknown }> = [];

  function assertEqual(name: string, actual: unknown, expected: unknown) {
    const pass = actual === expected;
    assertions.push({ name, pass, expected, actual });
    if (!pass) {
      console.error(`FAIL: ${name} -> expected ${expected}, got ${actual}`);
    } else {
      console.log(`PASS: ${name}`);
    }
  }

  const mockAdmin: AuthUser = {
    uid: 'admin_test_uid',
    username: 'admin',
    role: 'admin',
    credits: 9999,
    exp: 25000,
    rank: 'OG Player',
    isBanned: false,
    isRestricted: false,
  };

  const mockPlayerUser: AuthUser = {
    uid: '1DrJrVqcwfULvzDyyLV5S8b8ST03',
    username: 'lois_123xx',
    role: 'user',
    credits: 332,
    exp: 1251,
    rank: 'Gamer',
    isBanned: false,
    isRestricted: false,
  };

  // 1. Non-admin block test
  let nonAdminBlocked = false;
  try {
    adjustPlayerCredits({
      adminUser: mockPlayerUser, // Player role
      targetUserId: '1DrJrVqcwfULvzDyyLV5S8b8ST03',
      targetUsername: 'lois_123xx',
      amount: 50,
      type: 'add',
      reason: 'Should be rejected',
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes('Administrator privileges required')) {
      nonAdminBlocked = true;
    }
  }
  assertEqual('Security Guard: Non-admin is blocked from credit adjustments', nonAdminBlocked, true);

  // 2. Reason required test
  let emptyReasonBlocked = false;
  try {
    adjustPlayerCredits({
      adminUser: mockAdmin,
      targetUserId: '1DrJrVqcwfULvzDyyLV5S8b8ST03',
      targetUsername: 'lois_123xx',
      amount: 50,
      type: 'add',
      reason: '   ', // Empty
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes('A valid adjustment reason is strictly required')) {
      emptyReasonBlocked = true;
    }
  }
  assertEqual('Audit Guard: Empty reason is strictly rejected', emptyReasonBlocked, true);

  // 3. Amount validation test
  let zeroAmountBlocked = false;
  try {
    adjustPlayerCredits({
      adminUser: mockAdmin,
      targetUserId: '1DrJrVqcwfULvzDyyLV5S8b8ST03',
      targetUsername: 'lois_123xx',
      amount: 0,
      type: 'add',
      reason: 'Zero test',
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes('positive number')) {
      zeroAmountBlocked = true;
    }
  }
  assertEqual('Validation Guard: Zero or negative amount is rejected', zeroAmountBlocked, true);

  const allPassed = assertions.every((a) => a.pass);
  console.log(`\nAdmin Service Test Summary: ${assertions.filter((a) => a.pass).length}/${assertions.length} assertions passed.`);
  return allPassed;
}
