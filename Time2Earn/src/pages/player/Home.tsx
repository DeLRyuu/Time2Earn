import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArcadeIcon } from '../../components/ui/ArcadeIcon';
import { RankUpCelebrationModal } from '../../components/common/RankUpCelebrationModal';
import { useAuth } from '../../hooks/useAuth';
import { useConfig } from '../../hooks/useConfig';
import { useToast } from '../../hooks/useToast';
import { calculateRankProgress } from '../../lib/ranks';
import { calculateCreditPreview } from '../../lib/credits';
import { submitSessionRequest, fetchPlayerSessions } from '../../services/sessionService';
import { BACKUP_REWARDS } from '../../services/redemptionService';
import type { SessionRequest } from '../../types/session';
import tokenCoinImg from '../../assets/token/token-coin.png';
import streakImg from '../../assets/streak/streak.png';
import './Home.css';

const POPULAR_UNITS = ['PC-01', 'PC-02', 'PC-03', 'PC-04', 'PC-05', 'PC-06', 'PC-07', 'PC-08', 'PC-09', 'PC-10'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const Home: React.FC = () => {
  const { user } = useAuth();
  const { config } = useConfig();
  const { showToast } = useToast();

  // Insert Coin State
  const [pesosInput, setPesosInput] = useState<string>('');
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [coinDropping, setCoinDropping] = useState<boolean>(false);
  const dropTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Player's Session History (for pending claims counter)
  const [playerSessions, setPlayerSessions] = useState<SessionRequest[]>([]);

  // Gamification Rank Up State
  const [isCelebrationOpen, setIsCelebrationOpen] = useState(false);

  // Fallback demo user if not logged in
  const currentUser = user || {
    uid: 'player_test_uid',
    username: 'lois_123xx',
    role: 'user' as const,
    credits: 332,
    exp: 1251,
    rank: 'Gamer',
    streak: 3,
    isBanned: false,
    isRestricted: false,
  };

  // Load session requests to monitor pending claims
  useEffect(() => {
    let isMounted = true;
    const loadInitial = async () => {
      try {
        const data = await fetchPlayerSessions(currentUser.uid);
        if (isMounted) setPlayerSessions(data);
      } catch (err) {
        console.warn('Could not fetch sessions:', err);
      }
    };
    loadInitial();
    return () => {
      isMounted = false;
      if (dropTimerRef.current) clearTimeout(dropTimerRef.current);
    };
  }, [currentUser.uid]);

  const pendingCount = useMemo(() => {
    return playerSessions.filter((s) => s.status === 'pending').length;
  }, [playerSessions]);

  // Rank Progress calculation
  const rankProgress = useMemo(() => {
    return calculateRankProgress(currentUser.exp, config.rankThresholds);
  }, [currentUser.exp, config.rankThresholds]);

  // Rank span calculations for segmented bar
  const { currentRank, nextRank, expToNextRank, currentThreshold, nextThreshold, progressInRank, rankSpan, progressPct } = useMemo(() => {
    const thresholds = config.rankThresholds;
    const curRank = rankProgress.currentRank;
    const nxtRank = rankProgress.nextRank || curRank;
    const curThresh = thresholds[curRank] ?? 0;
    const nxtThresh = thresholds[nxtRank] ?? curThresh;
    const span = Math.max(1, nxtThresh - curThresh);
    const inRank = Math.max(0, currentUser.exp - curThresh);
    const pct = Math.min(100, Math.max(0, Math.round((inRank / span) * 100)));

    return {
      currentRank: curRank,
      nextRank: nxtRank,
      expToNextRank: rankProgress.expRemaining,
      currentThreshold: curThresh,
      nextThreshold: nxtThresh,
      progressInRank: inRank,
      rankSpan: span,
      progressPct: pct,
    };
  }, [currentUser.exp, config.rankThresholds, rankProgress]);

  // Rank-Up Celebration Modal Trigger
  useEffect(() => {
    if (rankProgress.currentRank && currentUser.uid) {
      const storageKey = `t2e_last_celebrated_rank_${currentUser.uid}`;
      const lastCelebrated = localStorage.getItem(storageKey);
      let timer: ReturnType<typeof setTimeout> | null = null;
      if (!lastCelebrated) {
        if (rankProgress.currentRank !== 'Newbie') {
          timer = setTimeout(() => setIsCelebrationOpen(true), 150);
        }
      } else if (lastCelebrated !== rankProgress.currentRank) {
        timer = setTimeout(() => setIsCelebrationOpen(true), 150);
      }
      return () => {
        if (timer) clearTimeout(timer);
      };
    }
  }, [rankProgress.currentRank, currentUser.uid]);

  const handleDismissCelebration = () => {
    if (currentUser.uid) {
      localStorage.setItem(`t2e_last_celebrated_rank_${currentUser.uid}`, rankProgress.currentRank);
    }
    setIsCelebrationOpen(false);
  };

  // Insert Coin calculation
  const numPesos = Math.floor(Number(pesosInput) || 0);
  const conversionRate = config.phpToCreditRate || 1;
  const previewTokens = Math.floor(calculateCreditPreview(numPesos, conversionRate));
  const hasUnit = Boolean(selectedUnit);
  const canInsert = hasUnit && numPesos >= 1 && previewTokens >= 1;

  const validationMsg = useMemo(() => {
    if (!hasUnit) {
      return 'Select a PC unit first.';
    }
    if (numPesos > 0 && previewTokens < 1) {
      return 'Insert at least ₱1.';
    }
    return '';
  }, [hasUnit, numPesos, previewTokens]);

  const handleQuickAmount = (amt: number) => {
    setPesosInput(String(amt));
  };

  const handleInsertCoin = async () => {
    if (!canInsert || !selectedUnit || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // 1. Submit session request via server-authoritative service
      await submitSessionRequest({
        userId: currentUser.uid,
        username: currentUser.username,
        unitId: selectedUnit,
        amountPaid: numPesos,
        phpToCreditRate: conversionRate,
      });

      // 2. Trigger coin drop animation
      setCoinDropping(false);
      // Force repaint to re-trigger css keyframe
      requestAnimationFrame(() => {
        setCoinDropping(true);
        dropTimerRef.current = setTimeout(() => {
          setCoinDropping(false);
        }, 700);
      });

      // 3. Feedback toast
      showToast(
        `Coin accepted! +${previewTokens} ${previewTokens > 1 ? 'tokens' : 'token'} (Claim pending staff approval for ${selectedUnit})`,
        'success'
      );

      // 4. Reset input and refresh session queue
      setPesosInput('');
      const updated = await fetchPlayerSessions(currentUser.uid);
      setPlayerSessions(updated);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to insert coins.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Streak calculations (Mon to Sun row)
  const streakCount = currentUser.streak ?? 1;
  const streakIndex = (streakCount - 1) % 7;
  const nextDayName = DAY_NAMES[(streakIndex + 1) % 7];

  // Dynamic count of claimable prizes
  const claimableCount = useMemo(() => {
    const tokens = currentUser.credits ?? 0;
    return BACKUP_REWARDS.filter((r) => r.isActive && r.creditCost <= tokens).length;
  }, [currentUser.credits]);

  return (
    <div className="home-view">
      {/* 1. Welcome Panel (Card: Hero + Streak) */}
      <section className="card hero" aria-label="Player Overview">
        <div className="av" aria-hidden="true">
          <ArcadeIcon name="pad" />
        </div>

        <div className="grow">
          <h1>Welcome back, {currentUser.username}</h1>
          <p className="m">
            You’re a {currentRank}. Earn {expToNextRank.toLocaleString()} more EXP to unlock {nextRank}.
          </p>

          <div
            className="bar"
            style={{ marginTop: '16px' }}
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progress to ${nextRank}`}
          >
            <i style={{ width: `${progressPct}%` }} />
          </div>

          <div className="lv">
            <span>{currentRank} · {currentThreshold.toLocaleString()}</span>
            <span className="m">
              {progressInRank.toLocaleString()} / {rankSpan.toLocaleString()} to {nextRank}
            </span>
            <span>{nextRank} · {nextThreshold.toLocaleString()}</span>
          </div>
        </div>

        {/* Streak box on the right */}
        <div className="streak">
         <div className="sk">
            <img
              src={streakImg}
              alt=""
              aria-hidden="true"
              style={{
                width: '40px',
                height: '40px',
                objectFit: 'contain',
                display: 'block',
              }}
            />
            <span className="d">{streakCount}</span>
            <span>day streak</span>
          </div>

          <div className="days" aria-label="Streak Days">
            {WEEKDAYS.map((day, idx) => {
              const isHit = idx <= streakIndex;
              const isNext = idx === (streakIndex + 1) % 7;
              const cls = isHit ? 'hit' : isNext ? 'next' : '';
              return (
                <span key={day} className={cls} title={`${day}: ${isHit ? 'Completed' : isNext ? 'Next goal' : 'Upcoming'}`}>
                  {day}
                </span>
              );
            })}
          </div>

          <p className="m">Check in {nextDayName} to reach {streakCount + 1}.</p>
        </div>
      </section>

      {/* 2. Insert Coin Panel */}
      <section className="card coin" aria-labelledby="ct">
        <div>
          <h2 id="ct">Insert Coin</h2>
          <p className="m">Ilagay kung ilang pesos ang hinulog.</p>

          <div className="slot">
            <span className={`cdrop ${coinDropping ? 'go' : ''}`} id="cdrop" aria-hidden="true">
              <ArcadeIcon name="coin" />
            </span>
          </div>

          <label htmlFor="ci" className="m" style={{ display: 'block', margin: '16px 0 6px' }}>
            Pesos to insert
          </label>
          <input
            id="ci"
            className="field"
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            placeholder="0"
            value={pesosInput}
            onChange={(e) => setPesosInput(e.target.value)}
          />

          <div className="qs">
            <button type="button" onClick={() => handleQuickAmount(5)}>₱5</button>
            <button type="button" onClick={() => handleQuickAmount(10)}>₱10</button>
            <button type="button" onClick={() => handleQuickAmount(15)}>₱15</button>
            <button type="button" onClick={() => handleQuickAmount(20)}>₱20</button>
            <button type="button" onClick={() => handleQuickAmount(25)}>₱25</button>
            <button type="button" onClick={() => handleQuickAmount(30)}>₱30</button>
          </div>

          <div className="unit-row">
            <label htmlFor="unit-select" className="m" style={{ fontSize: '14px' }}>PC Unit:</label>
            <select
              id="unit-select"
              className="unit-select"
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
            >
              <option value="" disabled>
                Select unit
              </option>
              {POPULAR_UNITS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="out">
          <p className="m">You’ll get</p>
          <div className="tkrow">
            <span className="tk" aria-hidden="true">
              <img
                src={tokenCoinImg}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
              />
            </span>
            <span className="d" style={{ fontSize: '52px' }}>
              <span id="prev">{previewTokens}</span> Tokens
            </span>
          </div>
 
          <p id="cmsg" className="need" aria-live="polite">
            {validationMsg}
          </p>

          <button
            className="btn"
            id="cgo"
            disabled={!canInsert || isSubmitting}
            onClick={handleInsertCoin}
          >
            {isSubmitting ? 'Inserting...' : 'Insert coin'}
          </button>

          <p className="m">
            Token balance: <b id="tk2">{currentUser.credits.toLocaleString()}</b>
          </p>

          {pendingCount > 0 && (
            <p className="m" style={{ color: 'var(--y)', fontSize: '13px' }}>
              {pendingCount} claim(s) awaiting staff approval
            </p>
          )}
        </div>
      </section>

      {/* 3. Two Big Tiles (Arcade Zone & Prize Shop) */}
      <div className="tiles">
        <Link to="/player/arcade" className="tile a" aria-label="Go to Arcade Zone">
          <ArcadeIcon name="joy" className="bg" />
          <span className="badge" style={{ background: 'var(--on)', color: 'var(--y)' }}>
            1 game open
          </span>
          <h2>Arcade Zone</h2>
          <p>Jump in, score big, earn EXP.</p>
          <span className="go">Play now</span>
        </Link>

        <Link to="/player/rewards" className="tile s" aria-label="Go to Prize Shop">
          <ArcadeIcon name="gift" className="bg" />
          <span className="badge" style={{ background: 'var(--on)', color: 'var(--r)' }}>
            {claimableCount} prizes ready
          </span>
          <h2>Prize Shop</h2>
          <p>You have {currentUser.credits.toLocaleString()} tokens to spend.</p>
          <span className="go">Pick a prize</span>
        </Link>
      </div>

      {/* Rank Up Promotion Modal */}
      <RankUpCelebrationModal
        isOpen={isCelebrationOpen}
        onClose={handleDismissCelebration}
        newRank={rankProgress.currentRank}
        exp={currentUser.exp}
      />
    </div>
  );
};