import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { RankBadge } from '../../components/ui/RankBadge';
import { useConfig } from '../../hooks/useConfig';
import { useAuth } from '../../hooks/useAuth';
import {
  fetchPublicLeaderboard,
  calculateLeaderboardCycle,
  type LeaderboardEntry,
} from '../../services/leaderboardService';

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
  const topThree = entries.slice(0, 3);
  const restEntries = entries.slice(3);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
      {/* 1. Header & Live Cycle Countdown Banner */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0, letterSpacing: '0.02em' }}>
              CHAMPIONS LEADERBOARD
            </h1>
            <Badge variant="gold" size="sm">
              🏆 SEASONAL
            </Badge>
          </div>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Top gamers ranked by lifetime EXP. Tournaments cycle every {config.leaderboardResetDays} days.
          </p>
        </div>

        {/* Live Cycle Pill */}
        <div
          style={{
            background: 'rgba(255, 183, 3, 0.1)',
            border: '1px solid rgba(255, 183, 3, 0.35)',
            borderRadius: 'var(--radius-md)',
            padding: '0.5rem 0.85rem',
            textAlign: 'right',
          }}
        >
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent-gold)', textTransform: 'uppercase' }}>
            RESET WINDOW ({config.leaderboardResetDays} DAYS)
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 900, color: 'var(--accent-gold)' }}>
            ⏳ {cycleInfo.formattedCountdown}
          </div>
        </div>
      </div>

      {/* 2. Current Player Highlight Card */}
      {user && userStanding && (
        <Card
          variant="neon"
          style={{
            borderLeft: '4px solid var(--primary)',
            background: 'linear-gradient(90deg, rgba(0, 229, 255, 0.08) 0%, rgba(15, 23, 42, 0.9) 100%)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: 'var(--primary-dim)',
                  border: '1px solid var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '1.1rem',
                  color: 'var(--primary)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                #{userStanding.rankPosition}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 900, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                    {userStanding.username}
                  </span>
                  <Badge variant="primary" size="sm">YOU</Badge>
                  <RankBadge rank={userStanding.rank} size="sm" />
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Total Participants: {totalParticipants} players
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--secondary)', fontFamily: 'var(--font-mono)' }}>
                ⭐ {userStanding.exp.toLocaleString()} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>EXP</span>
              </div>
              {userStanding.rankPosition > 1 && (
                <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
                  {(() => {
                    const prevEntry = entries[userStanding.rankPosition - 2];
                    if (prevEntry) {
                      const gap = prevEntry.exp - userStanding.exp;
                      return `⚡ Only ${gap.toLocaleString()} EXP to overtake #${prevEntry.rankPosition} ${prevEntry.username}`;
                    }
                    return '⚡ Keep grinding to climb!';
                  })()}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* 3. Top 3 Podium Showcase */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          {[...Array(3)].map((_, i) => (
            <Card key={i} variant="default">
              <Skeleton height="140px" />
            </Card>
          ))}
        </div>
      ) : topThree.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1rem',
            alignItems: 'stretch',
          }}
        >
          {topThree.map((player) => {
            const isFirst = player.rankPosition === 1;
            const isSecond = player.rankPosition === 2;

            const crownIcon = isFirst ? '👑' : isSecond ? '🥈' : '🥉';
            const podiumTitle = isFirst ? '1ST CHAMPION' : isSecond ? '2ND RUNNER-UP' : '3RD PLACE';
            const borderColor = isFirst
              ? 'var(--accent-gold)'
              : isSecond
              ? 'rgba(148, 163, 184, 0.6)'
              : 'rgba(217, 119, 6, 0.6)';

            return (
              <Card
                key={player.username}
                variant={isFirst ? 'gold' : 'default'}
                style={{
                  border: `2px solid ${borderColor}`,
                  background: isFirst
                    ? 'linear-gradient(180deg, rgba(255, 183, 3, 0.12) 0%, rgba(15, 23, 42, 0.95) 100%)'
                    : 'var(--surface-sunken)',
                  textAlign: 'center',
                  padding: '1.25rem',
                  position: 'relative',
                  boxShadow: isFirst ? '0 0 20px rgba(255, 183, 3, 0.2)' : 'none',
                }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>{crownIcon}</div>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: isFirst ? 'var(--accent-gold)' : 'var(--text-muted)', letterSpacing: '0.05em' }}>
                  {podiumTitle}
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-primary)', margin: '0.35rem 0' }}>
                  {player.username}
                  {player.isCurrentUser && <span style={{ color: 'var(--primary)', fontSize: '0.75rem', marginLeft: '0.35rem' }}>(You)</span>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', margin: '0.5rem 0' }}>
                  <RankBadge rank={player.rank} size="sm" />
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: isFirst ? 'var(--accent-gold)' : 'var(--secondary)', fontFamily: 'var(--font-mono)', marginTop: '0.5rem' }}>
                  ⭐ {player.exp.toLocaleString()} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>EXP</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* 4. Ranks 4 to 20 Leaderboard Table */}
      <Card
        variant="default"
        header={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>TOP 20 LEADERBOARD STANDINGS</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              Showing {entries.length} contenders
            </span>
          </div>
        }
      >
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} height="44px" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <EmptyState
            icon={<span>🏆</span>}
            title="NO LEADERBOARD DATA"
            description="No players recorded on the leaderboard yet. Start gaming to claim the #1 spot!"
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {restEntries.map((player) => (
              <div
                key={player.username}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  background: player.isCurrentUser ? 'rgba(0, 229, 255, 0.08)' : 'var(--bg-elevated)',
                  border: player.isCurrentUser ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                  transition: 'transform 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 900,
                      color: player.isCurrentUser ? 'var(--primary)' : 'var(--text-muted)',
                      width: '32px',
                      fontSize: '0.9rem',
                    }}
                  >
                    #{player.rankPosition}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 800, color: player.isCurrentUser ? 'var(--primary)' : 'var(--text-primary)' }}>
                      {player.username}
                    </span>
                    {player.isCurrentUser && <Badge variant="primary" size="sm">YOU</Badge>}
                    <RankBadge rank={player.rank} size="sm" />
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.95rem', color: 'var(--secondary)' }}>
                    ⭐ {player.exp.toLocaleString()} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>EXP</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 5. Privacy Notice */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          padding: '0 0.5rem',
        }}
      >
        <span>🔒</span>
        <span>
          <strong>Public-Safe Standings:</strong> Only username, rank badge, and lifetime EXP score are public. Private credit balances, passwords, debts, and transaction histories are never exposed.
        </span>
      </div>
    </div>
  );
};
