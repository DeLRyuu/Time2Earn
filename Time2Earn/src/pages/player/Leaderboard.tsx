import React, { useState, useEffect, useMemo } from 'react';
import { ArcadeIcon } from '../../components/ui/ArcadeIcon';
import { useConfig } from '../../hooks/useConfig';
import { useAuth } from '../../hooks/useAuth';
import {
  fetchPublicLeaderboard,
  calculateLeaderboardCycle,
  type LeaderboardEntry,
} from '../../services/leaderboardService';
import './Leaderboard.css';

interface AnimatedExpProps {
  value: number;
}

const isReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const AnimatedExp: React.FC<AnimatedExpProps> = ({ value }) => {
  const [displayVal, setDisplayVal] = useState<number>(() => {
    return isReducedMotion() ? value : 0;
  });

  useEffect(() => {
    if (isReducedMotion() || value <= 0) {
      return;
    }

    const duration = 900;
    let startTimestamp: number | null = null;
    let rafId: number;

    const animate = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(easeOut * value);
      setDisplayVal(current);

      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      } else {
        setDisplayVal(value);
      }
    };

    rafId = requestAnimationFrame(animate);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [value]);

  const shown = isReducedMotion() ? value : displayVal;
  return <>{shown.toLocaleString()} EXP</>;
};

export const Leaderboard: React.FC = () => {
  const { config } = useConfig();
  const { user } = useAuth();

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [userStanding, setUserStanding] = useState<LeaderboardEntry | null>(null);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [loading, setLoading] = useState(true);

  // Live timer tick for cycle countdown
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute live cycle countdown from config.leaderboardResetDays
  const cycleInfo = useMemo(() => {
    return calculateLeaderboardCycle(
      config.leaderboardResetDays,
      config.updatedAt,
      currentTime
    );
  }, [config.leaderboardResetDays, config.updatedAt, currentTime]);

  // Load leaderboard entries
  useEffect(() => {
    let isMounted = true;
    const loadLeaderboard = async () => {
      setLoading(true);
      try {
        const result = await fetchPublicLeaderboard(user, 20);
        if (isMounted) {
          setEntries(result.entries);
          setUserStanding(result.userStanding);
          setTotalParticipants(result.totalParticipants);
        }
      } catch (err) {
        console.warn('Leaderboard fetch fallback:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadLeaderboard();
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Top 3 Podium
  const firstPlace = entries[0];
  const secondPlace = entries[1];
  const thirdPlace = entries[2];

  // Rest of entries (rank 4+) excluding current player if already pinned in list
  const listEntries = useMemo(() => {
    return entries.slice(3).filter((e) => !e.isCurrentUser);
  }, [entries]);

  // Motivation Chase Banner Calculations
  const chaseBanner = useMemo(() => {
    if (!userStanding) {
      return {
        title: 'Climb the Champions board.',
        subtitle: 'Play PC sessions and quick quiz games to earn EXP.',
        progressPct: 0,
      };
    }

    const myRank = userStanding.rankPosition;
    const myExp = userStanding.exp;

    if (myRank === 1) {
      const runnerUp = entries[1];
      const gap = runnerUp ? myExp - runnerUp.exp : 0;
      return {
        title: "You're #1. Defend your spot at the top.",
        subtitle: runnerUp
          ? `You lead #${runnerUp.username} by ${gap.toLocaleString()} EXP.`
          : 'Undisputed champion of Time2Earn.',
        progressPct: 100,
      };
    }

    if (myRank === 2) {
      const leader = entries[0];
      const gap = leader ? leader.exp - myExp : 0;
      const pct = leader ? Math.min(100, Math.round((myExp / leader.exp) * 100)) : 80;
      return {
        title: `You're #2. Beat ${leader?.username || 'the champion'} for 1st place.`,
        subtitle: `Earn ${gap.toLocaleString()} more EXP and you take 1st place.`,
        progressPct: pct,
      };
    }

    if (myRank === 3) {
      const second = entries[1];
      const gap = second ? second.exp - myExp : 0;
      const pct = second ? Math.min(100, Math.round((myExp / second.exp) * 100)) : 80;
      return {
        title: `You're #3. Beat ${second?.username || '2nd place'} for 2nd place.`,
        subtitle: `Earn ${gap.toLocaleString()} more EXP and you take 2nd place.`,
        progressPct: pct,
      };
    }

    // Rank 4 or lower: Target is #3 to reach podium
    const target = entries[2];
    const gap = target ? Math.max(1, target.exp - myExp) : 100;
    const pct = target ? Math.min(100, Math.max(5, Math.round((myExp / target.exp) * 100))) : 50;
    return {
      title: `You're #${myRank}. Beat ${target?.username || 'the podium'} to reach the podium.`,
      subtitle: `Earn ${gap.toLocaleString()} more EXP and you take 3rd place.`,
      progressPct: pct,
    };
  }, [userStanding, entries]);

  // Current player's gap text
  const myGapText = useMemo(() => {
    if (!userStanding) return '';
    if (userStanding.rankPosition === 1) {
      const runnerUp = entries[1];
      return runnerUp ? `+${(userStanding.exp - runnerUp.exp).toLocaleString()} lead` : 'Leader';
    }
    const targetIdx = userStanding.rankPosition - 2;
    const target = entries[targetIdx];
    if (target) {
      const diff = target.exp - userStanding.exp;
      return `${diff.toLocaleString()} to #${target.rankPosition}`;
    }
    return '';
  }, [userStanding, entries]);

  const playerCount = totalParticipants || entries.length;

  return (
    <div className="rankings-view">
      {/* 1. Header & Live Countdown */}
      <div className="rankings-head">
        <div>
          <h1>Champions board</h1>
          <p className="rankings-sub">
            Ranked by EXP. {playerCount} players are in this round.
          </p>
        </div>
        <div className="timer">
          <ArcadeIcon name="clock" />
          <span className="m">Round ends in</span>
          <b>{cycleInfo.formattedCountdown}</b>
        </div>
      </div>

      {/* 2. Motivation Chase Banner (Yellow) */}
      <div className="card chase">
        <div className="d">{chaseBanner.title}</div>
        <p>{chaseBanner.subtitle}</p>
        <div
          className="bar"
          role="progressbar"
          aria-valuenow={chaseBanner.progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <i style={{ width: `${chaseBanner.progressPct}%` }} />
        </div>
      </div>

      {/* 3. Two Columns: Left Top 3 Podium, Right Standings Panel */}
      <div className="rk">
        {/* LEFT COLUMN: Top 3 Podium */}
        <div className="pod">
          {/* 1st Place Champion */}
          <div className="card p1">
            {/* 4-point star sparkles */}
            <svg className="sparkle sparkle-1" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5Z" />
            </svg>
            <svg className="sparkle sparkle-2" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5Z" />
            </svg>
            <svg className="sparkle sparkle-3" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5Z" />
            </svg>
            <svg className="sparkle sparkle-4" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5Z" />
            </svg>

            <div className="p1-crown">
              <ArcadeIcon name="crown" />
            </div>
            <p>1st place</p>
            <div className="d">{firstPlace ? firstPlace.username : 'Empty'}</div>
            <div className="pt">
              <AnimatedExp value={firstPlace ? firstPlace.exp : 0} />
            </div>
          </div>

          {/* 2nd and 3rd Runner-Ups */}
          <div className="pair">
            <div className="card pc p2">
              <div className="n">2</div>
              <div className="d">{secondPlace ? secondPlace.username : 'Empty'}</div>
              <div className="pt">
                <AnimatedExp value={secondPlace ? secondPlace.exp : 0} />
              </div>
            </div>

            <div className="card pc p3">
              <div className="n">3</div>
              <div className="d">{thirdPlace ? thirdPlace.username : 'Empty'}</div>
              <div className="pt">
                <AnimatedExp value={thirdPlace ? thirdPlace.exp : 0} />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Player List in Scrollable Panel */}
        <div className="card standings-panel">
          <div className="standings-header">
            <h2>Standings</h2>
            <span className="standings-count">{playerCount} players</span>
          </div>

          <div className="standings-scroll">
            {loading ? (
              [1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="pl"
                  style={{ opacity: 0.5, minHeight: '38px' }}
                />
              ))
            ) : (
              <>
                {/* Player's Own Highlighted Row is FIRST and STICKY */}
                {userStanding && (
                  <div className="pl me">
                    <span className="rn">{userStanding.rankPosition}</span>
                    <div className="pl-user-col">
                      <span className="pl-username">{userStanding.username}</span>
                      <span
                        className="pl-badge"
                        style={{ background: 'var(--on)', color: 'var(--s)' }}
                      >
                        You
                      </span>
                    </div>
                    <span className="pt">{userStanding.exp.toLocaleString()} EXP</span>
                    <span className="gap">{myGapText}</span>
                  </div>
                )}

                {/* Ranks 4+ List */}
                {listEntries.map((player) => {
                  const leadDiff = userStanding ? userStanding.exp - player.exp : 0;
                  return (
                    <div key={player.username} className="pl">
                      <span className="rn">{player.rankPosition}</span>
                      <div className="pl-user-col">
                        <span className="pl-username">{player.username}</span>
                        <span className="pl-badge">{player.rank}</span>
                      </div>
                      <span className="pt">{player.exp.toLocaleString()} EXP</span>
                      <span className="gap">
                        {leadDiff > 0 ? `You lead by ${leadDiff.toLocaleString()}` : ''}
                      </span>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          <div className="standings-fade" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
};
