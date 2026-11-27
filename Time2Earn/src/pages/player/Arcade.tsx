import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ArcadeIcon } from '../../components/ui/ArcadeIcon';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { ARCADE_GAMES, getGameDef, SHARED_DAILY_TOKEN_CAP } from '../../arcade/registry';
import type { ArcadeGameId, ArcadeGameDef, GameResult, RewardResult } from '../../arcade/types';
import { GameShell } from '../../arcade/components/GameShell';
import { ArcadeResultModal } from '../../arcade/components/ArcadeResultModal';
import {
  getArcadeDailyTotals,
  submitArcadeResult,
  type ArcadeDailyTotals,
} from '../../services/arcadeResultService';
import {
  getLocalArcadeStats,
  saveLocalArcadeStats,
  evaluateAchievements,
  type ArcadeStats,
} from '../../arcade/achievements';
import { recordScore } from '../../arcade/leaderboard';
import { ReactionRush } from '../../arcade/games/reaction-rush/ReactionRush';
import { KeyboardNinja } from '../../arcade/games/keyboard-ninja/KeyboardNinja';
import { TargetHunter } from '../../arcade/games/target-hunter/TargetHunter';
import { ColorClash } from '../../arcade/games/color-clash/ColorClash';
import { Time2Rush } from '../../arcade/games/time2rush/Time2Rush';
import './Arcade.css';

export const Arcade: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [selectedGameId, setSelectedGameId] = useState<ArcadeGameId | null>(null);
  const [dailyTotals, setDailyTotals] = useState<ArcadeDailyTotals>({
    allTokens: 0,
    perGame: {},
  });
  const [lastResult, setLastResult] = useState<RewardResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Active player stats
  const activeUserId = user?.uid || 'demo_player';
  const [stats, setStats] = useState<ArcadeStats>(() => getLocalArcadeStats(activeUserId));

  const loadDailyTotals = useCallback(async () => {
    if (!user) return;
    try {
      const totals = await getArcadeDailyTotals(user.uid);
      setDailyTotals(totals);
    } catch (err) {
      console.warn('Failed to load arcade daily totals:', err);
    }
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    const fetchTotals = async () => {
      if (!user) return;
      try {
        const totals = await getArcadeDailyTotals(user.uid);
        if (isMounted) {
          setDailyTotals(totals);
        }
      } catch (err) {
        console.warn('Failed to load arcade daily totals:', err);
      }
    };

    const timer = setTimeout(() => {
      fetchTotals();
    }, 10);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [user]);

  // Handle game completion from mounted game cabinet
  const handleGameFinish = useCallback(
    async (result: GameResult) => {
      if (!user) {
        showToast('Please sign in to save arcade scores and rewards', 'error');
        return;
      }
      setIsSubmitting(true);
      try {
        const outcome = await submitArcadeResult(user, result);
        setLastResult(outcome);

        // Record score to leaderboard
        await recordScore(result.gameId, user, outcome.arcadeScore);

        // Update local stats
        const currentStats = getLocalArcadeStats(user.uid);
        const updatedCounts = {
          ...currentStats.gameCounts,
          [result.gameId]: (currentStats.gameCounts[result.gameId] || 0) + 1,
        };
        const updatedBestScores = {
          ...currentStats.bestScores,
          [result.gameId]: Math.max(
            currentStats.bestScores[result.gameId] || 0,
            outcome.arcadeScore
          ),
        };

        // Determine favorite game
        let favorite = currentStats.favoriteGame;
        let maxCount = 0;
        for (const [gid, count] of Object.entries(updatedCounts)) {
          if (count > maxCount) {
            maxCount = count;
            const def = getGameDef(gid as ArcadeGameId);
            favorite = def?.name || gid;
          }
        }

        const newStats: ArcadeStats = {
          totalGames: currentStats.totalGames + 1,
          totalTokensEarned: currentStats.totalTokensEarned + outcome.tokensAwarded,
          bestStreak: Math.max(currentStats.bestStreak, user.streak || 1),
          favoriteGame: favorite,
          gameCounts: updatedCounts,
          bestScores: updatedBestScores,
        };

        saveLocalArcadeStats(user.uid, newStats);
        setStats(newStats);

        // Evaluate achievements
        const unlocked = evaluateAchievements(user.uid, newStats);
        for (const ach of unlocked) {
          showToast(`Achievement Unlocked: ${ach.title}!`, 'success');
        }

        await refreshUser();
        await loadDailyTotals();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to submit game result';
        showToast(msg, 'error');
      } finally {
        setIsSubmitting(false);
      }
    },
    [user, refreshUser, loadDailyTotals, showToast]
  );

  const selectedDef = useMemo<ArcadeGameDef | undefined>(() => {
    return selectedGameId ? getGameDef(selectedGameId) : undefined;
  }, [selectedGameId]);

  /**
   * Single mount switch for arcade game cabinets.
   * Future phases mount their components here with onFinish={handleGameFinish}.
   */
  const renderGameCabinet = (gameId: ArcadeGameId) => {
    switch (gameId) {
      case 'reaction-rush':
        return <ReactionRush onFinish={handleGameFinish} />;
      case 'keyboard-ninja':
        return <KeyboardNinja onFinish={handleGameFinish} />;
      case 'target-hunter':
        return <TargetHunter onFinish={handleGameFinish} />;
      case 'color-clash':
        return <ColorClash onFinish={handleGameFinish} />;
      case 'time2rush':
        return <Time2Rush onComplete={handleGameFinish} />;
      default:
        return (
          <div className="arcade-empty" style={{ margin: '20px 0' }}>
            <ArcadeIcon name="lock" size={48} />
            <h2>Cabinet under construction</h2>
            <p>This game is being rebuilt for the 8-cabinet cyber arcade release.</p>
            <button
              type="button"
              className="game-btn"
              style={{ width: 'auto', marginTop: '12px' }}
              onClick={() => setSelectedGameId(null)}
            >
              Back to lobby
            </button>
          </div>
        );
    }
  };

  return (
    <div className="arcade-view">
      {/* Header */}
      <div className="arcade-head">
        <div>
          <h1>Arcade Zone</h1>
          <p className="arcade-sub">Pick a cabinet. Every run pays out tokens and EXP.</p>
        </div>
      </div>

      {/* Result Modal when game run completes */}
      {lastResult && (
        <ArcadeResultModal
          result={lastResult}
          onPlayAgain={() => setLastResult(null)}
          onBackToLobby={() => {
            setLastResult(null);
            setSelectedGameId(null);
          }}
        />
      )}

      {/* Main View: Active Game in Shell OR Hub Lobby */}
      {selectedDef && selectedDef.status === 'playable' ? (
        <GameShell
          game={selectedDef}
          onBack={() => setSelectedGameId(null)}
          tokensEarnedTodayAll={dailyTotals.allTokens}
          tokensEarnedTodayGame={dailyTotals.perGame[selectedDef.id] || 0}
        >
          {isSubmitting ? (
            <div className="arcade-empty">
              <ArcadeIcon name="joystick" size={48} />
              <h2>Validating run results...</h2>
              <p>Depositing tokens and EXP to your balance...</p>
            </div>
          ) : (
            renderGameCabinet(selectedDef.id)
          )}
        </GameShell>
      ) : (
        <>
          {/* Arcade Profile Overview */}
          <div className="arcade-profile-panel">
            <div className="arcade-profile-stat">
              <div className="arcade-stat-icon">
                <ArcadeIcon name="joystick" size={24} />
              </div>
              <div className="arcade-stat-info">
                <span className="arcade-stat-label">Total games</span>
                <span className="arcade-stat-val">{stats.totalGames.toLocaleString()}</span>
              </div>
            </div>

            <div className="arcade-profile-stat">
              <div className="arcade-stat-icon">
                <ArcadeIcon name="coin" size={24} />
              </div>
              <div className="arcade-stat-info">
                <span className="arcade-stat-label">Arcade tokens</span>
                <span className="arcade-stat-val" style={{ color: 'var(--y)' }}>
                  {stats.totalTokensEarned.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="arcade-profile-stat">
              <div className="arcade-stat-icon">
                <ArcadeIcon name="flame" size={24} />
              </div>
              <div className="arcade-stat-info">
                <span className="arcade-stat-label">Best streak</span>
                <span className="arcade-stat-val" style={{ color: 'var(--r)' }}>
                  {stats.bestStreak} {stats.bestStreak === 1 ? 'day' : 'days'}
                </span>
              </div>
            </div>

            <div className="arcade-profile-stat">
              <div className="arcade-stat-icon">
                <ArcadeIcon name="crown" size={24} />
              </div>
              <div className="arcade-stat-info">
                <span className="arcade-stat-label">Favorite game</span>
                <span className="arcade-stat-val" style={{ fontSize: '18px' }}>
                  {stats.favoriteGame || 'None'}
                </span>
              </div>
            </div>
          </div>

          {/* Cabinets Grid */}
          <div className="games-grid">
            {ARCADE_GAMES.map((game) => {
              const isPlayable = game.status === 'playable';
              const gameTokensToday = dailyTotals.perGame[game.id] || 0;

              return (
                <div
                  key={game.id}
                  className={`game-card ${isPlayable ? 'playable' : ''}`}
                >
                  <div className="game-scr" style={{ background: game.color }}>
                    <span className="game-scr-badge">
                      {isPlayable ? 'Playable' : 'Coming soon'}
                    </span>
                    <ArcadeIcon name={game.icon} />
                  </div>

                  <div className="game-info">
                    <h3>{game.name}</h3>
                    <p className="game-tagline">{game.tagline}</p>
                  </div>

                  <div className="game-meta-row">
                    <span>Daily cap: {game.dailyTokenCap} tokens</span>
                    <span style={{ color: 'var(--mute)' }}>
                      Today: {gameTokensToday}/{game.dailyTokenCap}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="game-btn"
                    disabled={!isPlayable}
                    onClick={() => setSelectedGameId(game.id)}
                  >
                    {isPlayable ? (
                      <>
                        <ArcadeIcon name="joystick" size={20} />
                        <span>Insert coin</span>
                      </>
                    ) : (
                      <>
                        <ArcadeIcon name="lock" size={18} />
                        <span>Cabinet locked</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Rules & Fair Play Notes */}
          <div className="arcade-notes">
            <div>
              • <strong>Fair play & daily caps:</strong> All cabinets share a daily maximum of{' '}
              <strong>{SHARED_DAILY_TOKEN_CAP} tokens/day</strong>. Once reached, scores and EXP continue to count toward leaderboards.
            </div>
            <div>
              • <strong>Deterministic anti-cheat:</strong> Game results are validated authoritatively on completion. Single-use sessions prevent replay tampering.
            </div>
          </div>
        </>
      )}
    </div>
  );
};
