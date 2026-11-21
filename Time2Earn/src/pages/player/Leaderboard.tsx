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

  return (
    <div className="rankings-view">
      {/* 1. Header & Live Countdown */}
      <div className="rankings-head">
        <div>
          <h1>Champions board</h1>
          <p className="rankings-sub">
            Ranked by EXP. {totalParticipants || entries.length} players are in this round.
          </p>
        </div>
        <div className="timer">
          <ArcadeIcon name="clock" />
          <span className="m">Round ends in</span>
          <b>{cycleInfo.formattedCountdown}</b>
        </div>
      </div>

      {/* 2. Motivation Chase Banner (Red) */}
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

      {/* 3. Two Columns: Left Podium, Right List */}
      <div className="rk">
        {/* LEFT COLUMN: Top 3 Podium */}
        <div className="pod">
          {/* 1st Place Champion */}
          <div className="card p1">
            <ArcadeIcon name="crown" />
            <p>1st place</p>
            <div className="d">{firstPlace ? firstPlace.username : 'Empty'}</div>
            <div className="pt">
              {firstPlace ? `${firstPlace.exp.toLocaleString()} EXP` : '0 EXP'}
            </div>
          </div>

          {/* 2nd and 3rd Runner-Ups */}
          <div className="pair">
            <div className="card pc">
              <div className="n" style={{ background: '#D5DAF5' }}>
                2
              </div>
              <div className="d">{secondPlace ? secondPlace.username : 'Empty'}</div>
              <div className="pt">
                {secondPlace ? `${secondPlace.exp.toLocaleString()} EXP` : '0 EXP'}
              </div>
            </div>

            <div className="card pc">
              <div className="n" style={{ background: '#F0A15E' }}>
                3
              </div>
              <div className="d">{thirdPlace ? thirdPlace.username : 'Empty'}</div>
              <div className="pt">
                {thirdPlace ? `${thirdPlace.exp.toLocaleString()} EXP` : '0 EXP'}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Player List */}
        <div className="list">
          {loading ? (
            [1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="pl"
                style={{ opacity: 0.5, minHeight: '52px' }}
              />
            ))
          ) : (
            <>
              {/* Player's Own Highlighted Row is FIRST */}
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
      </div>

      {/* Privacy Notice */}
      <div className="privacy-note">
        <ArcadeIcon name="lock" size={18} />
        <span>
          Public-safe standings: Only username, rank badge, and lifetime EXP score are public. Private balances, debts, and transaction histories are never exposed.
        </span>
      </div>
    </div>
  );
};
