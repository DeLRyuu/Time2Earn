import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../hooks/useAuth';
import { useConfig } from '../../hooks/useConfig';
import { useToast } from '../../hooks/useToast';
import { usePlayerDashboard } from '../../hooks/usePlayerDashboard';
import { calculateRankProgress } from '../../lib/ranks';
import { Link } from 'react-router-dom';

export const Home: React.FC = () => {
  const { user } = useAuth();
  const { config, loading: configLoading } = useConfig();
  const { showToast } = useToast();
  const { featuredRewards, recentActivity, loading: dashLoading } = usePlayerDashboard();

  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);

  // Fallback demo user if not yet logged in
  const currentUser = user || {
    uid: 'demo_uid',
    username: 'lois_123xx',
    role: 'user' as const,
    credits: 332,
    exp: 1251,
    rank: 'Gamer',
    streak: 3,
    isBanned: false,
    isRestricted: false,
  };

  // Dynamic Rank Progress from Firestore config
  const rankProgress = calculateRankProgress(currentUser.exp, config.rankThresholds);

  return (
    <div className="dashboard-page" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* 1. Header: Welcome message */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '0.02em', color: 'var(--text-primary)' }}>
            Welcome back, <span style={{ color: 'var(--primary)', textShadow: '0 0 10px var(--primary-glow)' }}>{currentUser.username}</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Ready to grind? Play. Earn. Rank Up. Redeem.
          </p>
        </div>
        <Badge variant={currentUser.isRestricted ? 'danger' : 'success'} size="sm">
          {currentUser.isRestricted ? 'ACCOUNT FROZEN' : 'ACTIVE STATUS'}
        </Badge>
      </div>

      {/* 2. Stat Cards (Credits, Rank, EXP, Streak) - Visually Distinct */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '0.85rem',
          width: '100%',
        }}
      >
        {/* Credits Stat Card (Neon Cyan - Spendable Currency) */}
        <Card
          variant="neon"
          style={{
            background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.9) 0%, rgba(0, 229, 255, 0.05) 100%)',
            border: '1px solid rgba(0, 229, 255, 0.35)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              CREDITS
            </span>
            <span style={{ fontSize: '1.2rem' }}>💰</span>
          </div>
          <div
            style={{
              fontSize: '1.65rem',
              fontWeight: 900,
              color: 'var(--primary)',
              fontFamily: 'var(--font-mono)',
              marginTop: '0.35rem',
            }}
          >
            {currentUser.credits.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--primary)', marginTop: '0.2rem', opacity: 0.85 }}>
            Spendable Loot
          </div>
        </Card>

        {/* Rank Stat Card (Gold - Honor Tier) */}
        <Card
          variant="gold"
          style={{
            background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.9) 0%, rgba(255, 183, 3, 0.05) 100%)',
            border: '1px solid rgba(255, 183, 3, 0.35)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              RANK
            </span>
            <span style={{ fontSize: '1.2rem' }}>🏆</span>
          </div>
          <div
            style={{
              fontSize: '1.45rem',
              fontWeight: 900,
              color: 'var(--accent-gold)',
              marginTop: '0.35rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {currentUser.rank}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--accent-gold)', marginTop: '0.2rem', opacity: 0.85 }}>
            {rankProgress.isMaxRank ? 'Peak Legend' : `Tier ${rankProgress.currentThreshold.toLocaleString()} EXP`}
          </div>
        </Card>

        {/* EXP Stat Card (Cyber Violet - Lifetime Experience) */}
        <Card
          variant="interactive"
          style={{
            background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.9) 0%, rgba(139, 92, 246, 0.05) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.35)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              EXP
            </span>
            <span style={{ fontSize: '1.2rem' }}>⭐</span>
          </div>
          <div
            style={{
              fontSize: '1.65rem',
              fontWeight: 900,
              color: 'var(--secondary)',
              fontFamily: 'var(--font-mono)',
              marginTop: '0.35rem',
            }}
          >
            {currentUser.exp.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--secondary)', marginTop: '0.2rem', opacity: 0.85 }}>
            {rankProgress.isMaxRank ? 'Max Tier Achieved' : `${rankProgress.expRemaining.toLocaleString()} to ${rankProgress.nextRank}`}
          </div>
        </Card>

        {/* Streak Stat Card (Flame Orange - Daily Activity) */}
        <Card
          variant="interactive"
          style={{
            background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.9) 0%, rgba(245, 158, 11, 0.05) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              STREAK
            </span>
            <span style={{ fontSize: '1.2rem' }}>🔥</span>
          </div>
          <div
            style={{
              fontSize: '1.65rem',
              fontWeight: 900,
              color: 'var(--warning)',
              fontFamily: 'var(--font-mono)',
              marginTop: '0.35rem',
            }}
          >
            {currentUser.streak ?? 1} <span style={{ fontSize: '1rem', fontWeight: 700 }}>days</span>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--warning)', marginTop: '0.2rem', opacity: 0.85 }}>
            Daily check-in active
          </div>
        </Card>
      </div>

      {/* 3. Rank Progression Progress Bar */}
      <Card
        variant="default"
        header={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.05em' }}>
              RANK PROGRESSION
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {rankProgress.isMaxRank
                ? 'OG TOP RANK'
                : `${currentUser.exp.toLocaleString()} / ${rankProgress.nextThreshold?.toLocaleString()} EXP`}
            </span>
          </div>
        }
      >
        {configLoading ? (
          <Skeleton height="24px" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Badge variant="gold" size="sm">{rankProgress.currentRank}</Badge>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>current rank</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>next rank:</span>
                {rankProgress.isMaxRank ? (
                  <Badge variant="primary" size="sm">MAX REACHED</Badge>
                ) : (
                  <Badge variant="secondary" size="sm">{rankProgress.nextRank}</Badge>
                )}
              </div>
            </div>

            <ProgressBar
              value={rankProgress.progressPercent}
              max={100}
              variant="purple"
              size="md"
              showPercentage
            />

            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
              {rankProgress.isMaxRank
                ? '⭐ Congratulations! You have reached the pinnacle OG Player tier.'
                : `⚡ Only ${rankProgress.expRemaining.toLocaleString()} EXP needed to reach ${rankProgress.nextRank}!`}
            </div>
          </div>
        )}
      </Card>

      {/* 4. Quick Actions Hub */}
      <div>
        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
          QUICK ACTIONS
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.65rem' }}>
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsSessionModalOpen(true)}
            style={{ width: '100%', minHeight: '48px' }}
          >
            🎮 Play & Earn
          </Button>
          <Link to="/player/rewards" style={{ textDecoration: 'none' }}>
            <Button variant="secondary" size="md" style={{ width: '100%', minHeight: '48px' }}>
              🎁 Rewards
            </Button>
          </Link>
          <Link to="/player/arcade" style={{ textDecoration: 'none' }}>
            <Button variant="arcade" size="md" style={{ width: '100%', minHeight: '48px' }}>
              🕹️ Arcade
            </Button>
          </Link>
          <Link to="/player/leaderboard" style={{ textDecoration: 'none' }}>
            <Button variant="accent" size="md" style={{ width: '100%', minHeight: '48px' }}>
              🏆 Rankings
            </Button>
          </Link>
        </div>
      </div>

      {/* 5. Featured Rewards (Active Only, Max 2-3) */}
      <Card
        variant="default"
        header={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.05em' }}>
              FEATURED ACTIVE REWARDS
            </span>
            <Link to="/player/rewards" style={{ color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700 }}>
              VIEW ALL $\rightarrow$
            </Link>
          </div>
        }
      >
        {dashLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
            <Skeleton height="110px" />
            <Skeleton height="110px" />
            <Skeleton height="110px" />
          </div>
        ) : featuredRewards.length === 0 ? (
          <EmptyState
            title="NO ACTIVE REWARDS"
            description="The reward shop is currently updating its inventory."
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
            {featuredRewards.slice(0, 3).map((reward) => (
              <div
                key={reward.id}
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.85rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      {reward.name}
                    </span>
                    <Badge variant="primary" size="sm">{reward.category}</Badge>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem', lineHeight: 1.3 }}>
                    {reward.description}
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                  <div>
                    <span style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                      {reward.creditCost} CR
                    </span>
                    <div style={{ fontSize: '0.65rem', color: 'var(--secondary)' }}>
                      +{reward.expReward} EXP
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => showToast(`Redemption queue connects in Phase 6. Required: ${reward.creditCost} CR`, 'info')}
                  >
                    Redeem
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 6. Recent Activity (Player's Own Records Only) */}
      <Card
        variant="default"
        header={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.05em' }}>
              MY RECENT ACTIVITY
            </span>
            <Badge variant="neutral" size="sm">PERSONAL LOG</Badge>
          </div>
        }
      >
        {dashLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Skeleton height="45px" />
            <Skeleton height="45px" />
            <Skeleton height="45px" />
          </div>
        ) : recentActivity.length === 0 ? (
          <EmptyState
            title="NO RECENT ACTIVITY"
            description="Log your first gaming session to start earning Credits and EXP!"
            actionText="Play & Earn Now"
            onAction={() => setIsSessionModalOpen(true)}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {recentActivity.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.7rem 0.85rem',
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>
                    {item.type === 'session' ? '🎮' : '🎁'}
                  </span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {item.details} • {item.date}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Badge variant={item.badgeVariant} size="sm">
                    {item.badgeText}
                  </Badge>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Quick Session Claim Modal */}
      <Modal
        isOpen={isSessionModalOpen}
        onClose={() => setIsSessionModalOpen(false)}
        title="CLAIM GAMING SESSION"
        size="md"
        footer={
          <Button
            variant="primary"
            onClick={() => {
              setIsSessionModalOpen(false);
              showToast('Session request submission connects to Firestore in Phase 5!', 'info');
            }}
          >
            Submit Session Claim
          </Button>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Enter your PC station ID and amount paid to request credit & EXP claim:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              PC UNIT ID (e.g. PC-01)
            </label>
            <input
              type="text"
              defaultValue="PC-01"
              style={{
                padding: '0.65rem 0.85rem',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
              }}
            />
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              AMOUNT PAID (PHP)
            </label>
            <input
              type="number"
              defaultValue="20"
              style={{
                padding: '0.65rem 0.85rem',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
              }}
            />
            <div style={{ fontSize: '0.8rem', color: 'var(--primary)', marginTop: '0.25rem' }}>
              Estimated: ₱20 @ {config.phpToCreditRate}x = ~27 Credits, 27 EXP
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
