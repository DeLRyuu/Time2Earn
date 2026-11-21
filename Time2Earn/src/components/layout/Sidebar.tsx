import React, { useMemo } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ArcadeIcon } from '../ui/ArcadeIcon';
import { BACKUP_REWARDS } from '../../services/redemptionService';
import './Sidebar.css';

interface SidebarProps {
  isAdmin?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isAdmin = false }) => {
  const { user } = useAuth();

  // Dynamic claimable prizes calculation wired to real user token balance
  const claimableCount = useMemo(() => {
    const tokens = user?.credits ?? 0;
    return BACKUP_REWARDS.filter((r) => r.isActive && r.creditCost <= tokens).length;
  }, [user?.credits]);

  return (
    <nav className="side" aria-label={isAdmin ? 'Admin Console Navigation' : 'Main Navigation'}>
      {/* Brand Header */}
      <div className="logo">
        <b>
          <ArcadeIcon name="bolt" />
        </b>
        <div>
          <span>Time2Earn</span>
          <small>{isAdmin ? 'Staff console' : 'Play, earn, level up'}</small>
        </div>
      </div>

      {isAdmin ? (
        <>
          {/* Admin Navigation */}
          <NavLink
            to="/admin"
            end
            className={({ isActive }) => `nav ${isActive ? 'on' : ''}`}
          >
            <ArcadeIcon name="home" />
            <span>Overview</span>
          </NavLink>
          <NavLink
            to="/admin/sessions"
            className={({ isActive }) => `nav ${isActive ? 'on' : ''}`}
          >
            <ArcadeIcon name="joy" />
            <span>Sessions</span>
          </NavLink>
          <NavLink
            to="/admin/redemptions"
            className={({ isActive }) => `nav ${isActive ? 'on' : ''}`}
          >
            <ArcadeIcon name="gift" />
            <span>Redemptions</span>
          </NavLink>
          <NavLink
            to="/admin/debts"
            className={({ isActive }) => `nav ${isActive ? 'on' : ''}`}
          >
            <ArcadeIcon name="coin" />
            <span>Debts</span>
          </NavLink>
          <NavLink
            to="/admin/rewards"
            className={({ isActive }) => `nav ${isActive ? 'on' : ''}`}
          >
            <ArcadeIcon name="cart" />
            <span>Rewards</span>
          </NavLink>
          <NavLink
            to="/admin/users"
            className={({ isActive }) => `nav ${isActive ? 'on' : ''}`}
          >
            <ArcadeIcon name="user" />
            <span>Players</span>
          </NavLink>
          <NavLink
            to="/admin/logs"
            className={({ isActive }) => `nav ${isActive ? 'on' : ''}`}
          >
            <ArcadeIcon name="clock" />
            <span>Audit logs</span>
          </NavLink>
          <NavLink
            to="/admin/settings"
            className={({ isActive }) => `nav ${isActive ? 'on' : ''}`}
          >
            <ArcadeIcon name="settings" />
            <span>Settings</span>
          </NavLink>

          <div className="sp" />
          <Link to="/player" className="staff">
            Player view
          </Link>
        </>
      ) : (
        <>
          {/* Player Navigation */}
          <NavLink
            to="/player"
            end
            className={({ isActive }) => `nav ${isActive ? 'on' : ''}`}
          >
            <ArcadeIcon name="home" />
            <span>Home</span>
          </NavLink>

          {/* Arcade Zone: Big Yellow Button */}
          <NavLink
            to="/player/arcade"
            className={({ isActive }) => `nav big arc ${isActive ? 'on' : ''}`}
            aria-label="Arcade Zone"
          >
            <ArcadeIcon name="joy" />
            <span>Arcade Zone</span>
            <em>Play now</em>
          </NavLink>

          {/* Prize Shop: Big Red Button */}
          <NavLink
            to="/player/rewards"
            className={({ isActive }) => `nav big shop ${isActive ? 'on' : ''}`}
            aria-label="Prize Shop"
          >
            <ArcadeIcon name="gift" />
            <span>Prize Shop</span>
            <em id="canTag">{claimableCount} to claim</em>
          </NavLink>

          {/* Rankings: Champions Board */}
          <NavLink
            to="/player/leaderboard"
            className={({ isActive }) => `nav ${isActive ? 'on' : ''}`}
          >
            <ArcadeIcon name="cup" />
            <span>Rankings</span>
          </NavLink>

          <div className="sp" />

          {/* Staff Portal Link - Only for staff accounts */}
          {user?.role === 'admin' && (
            <Link to="/admin" className="staff">
              Staff portal
            </Link>
          )}
        </>
      )}
    </nav>
  );
};
