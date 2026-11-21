import {
  getLogMeta,
  formatLogDate,
  formatLogAmount,
  parseLogDate,
  fetchAdminLogs,
  KNOWN_LOG_ACTIONS,
  type LogEntry,
} from './logService';

export async function runLogServiceTests(): Promise<boolean> {
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

  console.log('\n--- Running Phase 10: Audit Trail Tests ---');

  // 1. Metadata for all 14 legacy action types plus staff_password_reset
  const legacyActions = [
    'session_requested',
    'session_approved',
    'session_rejected',
    'reward_requested',
    'redemption_approved',
    'redemption_rejected',
    'credits_deducted',
    'credits_added',
    'reward_toggled',
    'reward_updated',
    'config_updated',
    'debt_added',
    'debt_payment_requested',
    'rewards_bulk_imported',
    'staff_password_reset',
  ];

  legacyActions.forEach((action) => {
    const meta = getLogMeta(action);
    assertTrue(`Meta registered: ${action}`, !!meta && !!meta.label && !!meta.icon && !!meta.category);
  });

  // 2. Generic fallback for unknown actions
  const genericMeta = getLogMeta('custom_tournament_bonus_payout');
  assertEqual('Fallback label', genericMeta.label, 'Custom Tournament Bonus Payout');
  assertEqual('Fallback category', genericMeta.category, 'System');
  assertEqual('Fallback icon', genericMeta.icon, '📋');

  // 3. Date parsing and formatting
  const legacyTimestamp = '2026-10-08 09:41:54.448194+00:00';
  const parsedDate = parseLogDate(legacyTimestamp);
  assertTrue('Parses legacy UTC timestamp string', parsedDate instanceof Date && !isNaN(parsedDate.getTime()));

  const formattedDate = formatLogDate(legacyTimestamp);
  assertTrue('Formatted date string includes year and month', formattedDate.includes('2026') && formattedDate.includes('Oct'));

  const fsTimestamp = { seconds: 1729000000, nanoseconds: 0 };
  const parsedFsDate = parseLogDate(fsTimestamp);
  assertTrue('Parses Firestore seconds timestamp object', parsedFsDate instanceof Date && !isNaN(parsedFsDate.getTime()));

  assertEqual('Fallback for null date', formatLogDate(null), 'Unknown date');

  // 4. Amount formatting
  const sessionApproveLog: LogEntry = {
    id: '1',
    action: 'session_approved',
    amount: 27.5,
    createdAt: '2026-10-08T00:00:00Z',
  };
  assertEqual('Format positive session credits', formatLogAmount(sessionApproveLog), { text: '+27.50 cr', positive: true });

  const deductLog: LogEntry = {
    id: '2',
    action: 'credits_deducted',
    amount: 75,
    createdAt: '2026-10-08T00:00:00Z',
  };
  assertEqual('Format negative credits deducted', formatLogAmount(deductLog), { text: '-75.00 cr', positive: false });

  const debtLog: LogEntry = {
    id: '3',
    action: 'debt_added',
    amount: 50,
    createdAt: '2026-10-08T00:00:00Z',
  };
  assertEqual('Format debt PHP amount', formatLogAmount(debtLog), { text: '₱50.00', positive: false });

  const debtPayLog: LogEntry = {
    id: '3b',
    action: 'debt_payment_requested',
    amount: 15.2,
    createdAt: '2026-10-08T00:00:00Z',
  };
  assertEqual('Format debt payment PHP amount', formatLogAmount(debtPayLog), { text: '₱15.20', positive: true });

  const zeroLog: LogEntry = {
    id: '4',
    action: 'reward_toggled',
    amount: 0,
    createdAt: '2026-10-08T00:00:00Z',
  };
  assertEqual('Format zero amount returns null', formatLogAmount(zeroLog), null);

  // 5. Query and pagination (using sample backup logs)
  const page1 = await fetchAdminLogs({ page: 1, pageSize: 10 });
  assertTrue('Page 1 returns at most 10 logs', page1.logs.length <= 10 && page1.logs.length > 0);
  assertEqual('Page 1 index', page1.page, 1);
  assertTrue('Total count is recorded', page1.totalCount >= page1.logs.length);

  const page2 = await fetchAdminLogs({ page: 2, pageSize: 10 });
  if (page1.totalPages > 1) {
    assertTrue('Page 2 has different log ID than page 1', page1.logs[0].id !== page2.logs[0].id);
  }

  // 6. Action filtering
  const sessionReqLogs = await fetchAdminLogs({ page: 1, pageSize: 50, action: 'session_requested' });
  assertTrue(
    'Action filter matches session_requested',
    sessionReqLogs.logs.length > 0 && sessionReqLogs.logs.every((l) => l.action === 'session_requested')
  );

  // 7. Category filtering
  const debtCategoryLogs = await fetchAdminLogs({ page: 1, pageSize: 50, category: 'Debt' });
  assertTrue(
    'Category filter matches Debt',
    debtCategoryLogs.logs.length > 0 &&
      debtCategoryLogs.logs.every((l) => getLogMeta(l.action).category === 'Debt')
  );

  // 8. User query filtering
  const trixieLogs = await fetchAdminLogs({ page: 1, pageSize: 50, userQuery: 'trixie' });
  assertTrue(
    'User search matches query in userId or details',
    trixieLogs.logs.length > 0 &&
      trixieLogs.logs.every((l) =>
        (l.userId && l.userId.toLowerCase().includes('trixie')) ||
        (l.details && l.details.toLowerCase().includes('trixie'))
      )
  );

  // 9. Security audit: verify no secrets/passwords exist in log actions
  Object.entries(KNOWN_LOG_ACTIONS).forEach(([action, meta]) => {
    assertTrue(`No secrets in meta: ${action}`, !meta.description.toLowerCase().includes('password') || action === 'staff_password_reset');
  });

  const allPassed = assertions.every((a) => a.pass);
  console.log(`\nLog Service Test Summary: ${assertions.filter((a) => a.pass).length}/${assertions.length} assertions passed.\n`);
  return allPassed;
}
