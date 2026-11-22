import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import './UtangPage.css';

export interface UtangRecord {
  id: string;
  type: 'borrow' | 'token_payment';
  amountPesos: number;
  tokensAmount?: number;
  pcUnit?: string;
  status: 'unpaid' | 'pending' | 'paid';
  createdAt: string; // ISO string or readable date
  dueDate?: string; // ISO string (YYYY-MM-DD) for borrow records
  note?: string;
}

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const THREE_DAY_BORROW_LIMIT_PHP = 20;
const PRESET_AMOUNTS = [5, 10, 15, 20];
const PC_UNITS = ['PC-01', 'PC-02', 'PC-03', 'PC-04', 'PC-05', 'PC-06'];

// Example rate: 1 token = ₱1.00 (adjust to match your config/settings rate)
const TOKEN_TO_PESO_RATE = 1;

function getDefaultDueDateIso(daysAhead = 3): string {
  const d = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
  return d.toISOString().split('T')[0];
}

export const UtangPage: React.FC = () => {
  const { user } = useAuth();

  // Borrow state (real cash ₱ for play session only)
  const [amountPesos, setAmountPesos] = useState<number>(10);
  const [pcUnit, setPcUnit] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>(() => getDefaultDueDateIso(3));
  const [note, setNote] = useState<string>('');
  const [submittingBorrow, setSubmittingBorrow] = useState<boolean>(false);

  // Pay utang with tokens state
  const [tokenBalance, setTokenBalance] = useState<number>(25);
  const [tokensToPay, setTokensToPay] = useState<number>(10);
  const [submittingPayment, setSubmittingPayment] = useState<boolean>(false);

  const [feedback, setFeedback] = useState<string | null>(null);
  const [manualRestricted, setManualRestricted] = useState<boolean>(false);

  const [nowMs, setNowMs] = useState<number>(() => new Date('2026-11-21T12:00:00Z').getTime());

  // Replace with Firestore / debtService data
  const [records, setRecords] = useState<UtangRecord[]>([
    {
      id: 'UTG-101',
      type: 'borrow',
      amountPesos: 15,
      pcUnit: 'PC-03',
      status: 'unpaid',
      createdAt: '2026-11-21T12:00:00.000Z',
      dueDate: getDefaultDueDateIso(2),
      note: 'Play time session',
    },
  ]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  // Current unpaid/pending utang balance in ₱
  const currentBalancePesos = useMemo(() => {
    const borrowed = records
      .filter((r) => r.type === 'borrow' && (r.status === 'unpaid' || r.status === 'pending'))
      .reduce((sum, r) => sum + r.amountPesos, 0);

    const paidByTokens = records
      .filter((r) => r.type === 'token_payment' && (r.status === 'paid' || r.status === 'pending'))
      .reduce((sum, r) => sum + r.amountPesos, 0);

    return Math.max(0, Number((borrowed - paidByTokens).toFixed(2)));
  }, [records]);

  // Check if any unpaid borrow is past its due date
  const isOverdue = useMemo(() => {
    if (currentBalancePesos <= 0) return false;
    return records.some((r) => {
      if (r.type !== 'borrow' || r.status === 'paid' || !r.dueDate) return false;
      const dueEndMs = new Date(`${r.dueDate}T23:59:59`).getTime();
      return !Number.isNaN(dueEndMs) && nowMs > dueEndMs;
    });
  }, [records, currentBalancePesos, nowMs]);

  const isRestricted = manualRestricted || isOverdue;

  // Rolling 3-day (72-hour) borrow cap calculation (max ₱20 every 3 days)
  const threeDayAllowance = useMemo(() => {
    const windowStart = nowMs - THREE_DAYS_MS;

    const recentBorrows = records.filter((r) => {
      if (r.type !== 'borrow') return false;
      const t = new Date(r.createdAt).getTime();
      return !Number.isNaN(t) && t >= windowStart;
    });

    const borrowedInWindow = recentBorrows.reduce((sum, r) => sum + r.amountPesos, 0);
    const remaining = Math.max(0, Number((THREE_DAY_BORROW_LIMIT_PHP - borrowedInWindow).toFixed(2)));

    let nextResetLabel: string | null = null;
    if (recentBorrows.length > 0 && remaining === 0) {
      const oldestMs = Math.min(...recentBorrows.map((r) => new Date(r.createdAt).getTime()));
      nextResetLabel = new Date(oldestMs + THREE_DAYS_MS).toLocaleString();
    }

    return {
      borrowedInWindow,
      remaining,
      nextResetLabel,
    };
  }, [records, nowMs]);

  const maxBorrowAllowed = isRestricted ? 0 : threeDayAllowance.remaining;

  const handleRequestBorrow = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (isRestricted) {
      setFeedback('Account restricted: pay your overdue utang balance first before borrowing again.');
      return;
    }
    if (!pcUnit) {
      setFeedback('Select a PC unit first.');
      return;
    }
    if (!dueDate) {
      setFeedback('Select a due date.');
      return;
    }
    if (amountPesos <= 0 || amountPesos > maxBorrowAllowed) {
      setFeedback(`You can borrow between ₱1 and ₱${maxBorrowAllowed} within this 3-day window.`);
      return;
    }

    setSubmittingBorrow(true);

    const newBorrow: UtangRecord = {
      id: `UTG-${Math.floor(100 + Math.random() * 900)}`,
      type: 'borrow',
      amountPesos,
      pcUnit,
      status: 'pending',
      createdAt: new Date().toISOString(),
      dueDate,
      note: note.trim() || undefined,
    };

    setRecords((prev) => [newBorrow, ...prev]);
    setSubmittingBorrow(false);
    setNote('');
    setFeedback(
      `Borrow request for ₱${amountPesos} play cash submitted for ${pcUnit}. (Play time only — cannot be converted to tokens.)`
    );
  };

  const handlePayWithTokens = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (currentBalancePesos <= 0) {
      setFeedback('You have no unpaid utang balance.');
      return;
    }
    if (tokensToPay <= 0 || tokensToPay > tokenBalance) {
      setFeedback('Enter a valid token amount within your available token balance.');
      return;
    }

    const pesoValue = Number((tokensToPay * TOKEN_TO_PESO_RATE).toFixed(2));
    const appliedPesos = Math.min(pesoValue, currentBalancePesos);
    const actualTokensUsed = Math.ceil(appliedPesos / TOKEN_TO_PESO_RATE);

    setSubmittingPayment(true);

    const paymentRecord: UtangRecord = {
      id: `PAY-${Math.floor(100 + Math.random() * 900)}`,
      type: 'token_payment',
      amountPesos: appliedPesos,
      tokensAmount: actualTokensUsed,
      status: 'paid',
      createdAt: new Date().toISOString(),
      note: 'Paid using tokens',
    };

    const nextBalance = Math.max(0, Number((currentBalancePesos - appliedPesos).toFixed(2)));

    setTokenBalance((prev) => Math.max(0, prev - actualTokensUsed));
    setRecords((prev) => {
      const updated = prev.map((rec) =>
        nextBalance === 0 && rec.type === 'borrow' && (rec.status === 'unpaid' || rec.status === 'pending')
          ? { ...rec, status: 'paid' as const }
          : rec
      );
      return [paymentRecord, ...updated];
    });

    if (nextBalance === 0) {
      setManualRestricted(false);
    }

    setSubmittingPayment(false);
    setFeedback(
      nextBalance === 0
        ? `Paid ₱${appliedPesos} using ${actualTokensUsed} tokens. Your utang is now cleared and restrictions are lifted!`
        : `Applied ${actualTokensUsed} tokens (₱${appliedPesos}) toward your utang. Remaining balance: ₱${nextBalance}.`
    );
  };

  return (
    <div className="utang-page">
      {/* Header Banner */}
      <section className="utang-card utang-hero">
        <div className="utang-hero-icon">₱</div>
        <div className="utang-hero-info">
          <h1>Utang / Play Cash</h1>
          <p>
            Short on cash, <strong>{user?.username || 'Player'}</strong>? Borrow up to{' '}
            <strong>₱{THREE_DAY_BORROW_LIMIT_PHP} every 3 days</strong> for play time only.
          </p>
          <div className="utang-stats">
            <div className="stat-pill">
              <span>Current Utang Balance</span>
              <strong className={currentBalancePesos > 0 ? 'text-warn' : ''}>
                ₱{currentBalancePesos.toFixed(2)}
              </strong>
            </div>
            <div className="stat-pill">
              <span>3-Day Borrow Left</span>
              <strong>
                ₱{threeDayAllowance.remaining.toFixed(2)} / ₱{THREE_DAY_BORROW_LIMIT_PHP}
              </strong>
            </div>
            <div className="stat-pill">
              <span>Token Balance</span>
              <strong>{tokenBalance} Tokens</strong>
            </div>
            <div className="stat-pill">
              <span>Account Status</span>
              <strong className={isRestricted ? 'text-warn' : ''}>
                {isRestricted ? 'RESTRICTED' : 'ACTIVE'}
              </strong>
            </div>
          </div>
        </div>
      </section>

      {/* Main 2-Column Workspace: Left = Borrow & Token Payment, Right = Compact Scrollable History */}
      <div className="utang-workspace">
        {/* Left Column: Borrow Play Cash + Pay Utang Using Tokens */}
        <div className="utang-main-col">
          <section className="utang-card">
            <h2>Borrow Play Cash (Real Cash Only)</h2>
            <p className="utang-sub">
              Borrowed money is strictly for play time and cannot be converted or transferred into tokens.
            </p>

            <form onSubmit={handleRequestBorrow} className="utang-grid">
              <div className="utang-left">
                <label htmlFor="utang-amount">Pesos to borrow (Max ₱20 / 3 days)</label>
                <input
                  id="utang-amount"
                  type="number"
                  min={1}
                  max={Math.max(1, maxBorrowAllowed)}
                  value={amountPesos}
                  disabled={isRestricted || maxBorrowAllowed <= 0}
                  onChange={(e) => setAmountPesos(Number(e.target.value))}
                  className="utang-input"
                />

                <div className="preset-row">
                  {PRESET_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      disabled={isRestricted || amt > maxBorrowAllowed}
                      className={`preset-btn ${amountPesos === amt ? 'active' : ''}`}
                      onClick={() => setAmountPesos(amt)}
                    >
                      ₱{amt}
                    </button>
                  ))}
                </div>

                <div className="field-row-split">
                  <div className="field-row">
                    <label htmlFor="utang-pc">PC Unit:</label>
                    <select
                      id="utang-pc"
                      value={pcUnit}
                      disabled={isRestricted}
                      onChange={(e) => setPcUnit(e.target.value)}
                      className="utang-select"
                    >
                      <option value="">Select unit</option>
                      {PC_UNITS.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field-row">
                    <label htmlFor="utang-due">Due Date:</label>
                    <input
                      id="utang-due"
                      type="date"
                      value={dueDate}
                      disabled={isRestricted}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="utang-input small"
                    />
                  </div>
                </div>

                <div className="field-row">
                  <label htmlFor="utang-note">Note (optional):</label>
                  <input
                    id="utang-note"
                    type="text"
                    placeholder="e.g., Babayaran bago mag-due date"
                    value={note}
                    disabled={isRestricted}
                    onChange={(e) => setNote(e.target.value)}
                    className="utang-input small"
                  />
                </div>
              </div>

              <div className="utang-right">
                <span className="preview-label">Play Session Allocation</span>
                <div className="token-preview">₱{amountPesos.toFixed(2)}</div>
                <p className="preview-hint">
                  {isRestricted
                    ? 'Restricted: overdue utang must be cleared before borrowing.'
                    : threeDayAllowance.remaining === 0 && threeDayAllowance.nextResetLabel
                    ? `3-day limit reached. Resets around ${threeDayAllowance.nextResetLabel}.`
                    : 'Non-transferable play cash • Cannot convert to tokens'}
                </p>

                <button
                  type="submit"
                  className="utang-submit"
                  disabled={submittingBorrow || isRestricted || maxBorrowAllowed <= 0 || !pcUnit}
                >
                  {isRestricted
                    ? 'Account Restricted'
                    : maxBorrowAllowed <= 0
                    ? '3-Day Limit Reached'
                    : 'Borrow Play Cash'}
                </button>

                {feedback && <p className="utang-feedback">{feedback}</p>}
              </div>
            </form>
          </section>

          <section className="utang-card">
            <h2>Pay Utang Using Tokens</h2>
            <p className="utang-sub">
              Use your tokens to pay part or all of your current ₱{currentBalancePesos.toFixed(2)} balance.
            </p>

            <form onSubmit={handlePayWithTokens} className="utang-grid">
              <div className="utang-left">
                <label htmlFor="tokens-to-pay">Tokens to spend (1 Token = ₱{TOKEN_TO_PESO_RATE})</label>
                <input
                  id="tokens-to-pay"
                  type="number"
                  min={1}
                  max={Math.max(1, tokenBalance)}
                  value={tokensToPay}
                  disabled={currentBalancePesos <= 0 || tokenBalance <= 0}
                  onChange={(e) => setTokensToPay(Number(e.target.value))}
                  className="utang-input"
                />
              </div>

              <div className="utang-right">
                <span className="preview-label">Debt Reduction Preview</span>
                <div className="token-preview">
                  -₱{Math.min(tokensToPay * TOKEN_TO_PESO_RATE, currentBalancePesos).toFixed(2)}
                </div>
                <p className="preview-hint">Available: {tokenBalance} tokens</p>

                <button
                  type="submit"
                  className="utang-submit"
                  disabled={submittingPayment || currentBalancePesos <= 0 || tokenBalance <= 0}
                >
                  {currentBalancePesos <= 0 ? 'No Utang to Pay' : 'Pay Utang with Tokens'}
                </button>
              </div>
            </form>
          </section>
        </div>

        {/* Right Column: Compact Scrollable Utang & Payment History */}
        <aside className="utang-side-col">
          <section className="utang-card utang-history-card">
            <div className="history-header">
              <h2>Utang & Payment History</h2>
              <span className="history-count">{records.length}</span>
            </div>
            <p className="utang-sub compact-sub">Scrolls inside panel only.</p>

            {records.length === 0 ? (
              <p className="utang-sub">No utang records yet. Clean slate!</p>
            ) : (
              <div className="utang-list">
                {records.map((item) => (
                  <div key={item.id} className="utang-item">
                    <div className="utang-item-body">
                      {item.type === 'borrow' ? (
                        <>
                          <strong>₱{item.amountPesos.toFixed(2)}</strong> • <span>{item.pcUnit || 'N/A'}</span>
                          <small>Play Cash • Due: {item.dueDate || 'N/A'}</small>
                          <small>
                            {new Date(item.createdAt).toLocaleDateString()}
                            {item.note ? ` • ${item.note}` : ''}
                          </small>
                        </>
                      ) : (
                        <>
                          <strong>-₱{item.amountPesos.toFixed(2)}</strong> ({item.tokensAmount} tokens)
                          <small>
                            Token Payment • {new Date(item.createdAt).toLocaleDateString()}
                            {item.note ? ` • ${item.note}` : ''}
                          </small>
                        </>
                      )}
                    </div>
                    <span className={`status-badge ${item.status}`}>{item.status.toUpperCase()}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
};