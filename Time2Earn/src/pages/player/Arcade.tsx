import React from 'react';
import { ArcadeIcon } from '../../components/ui/ArcadeIcon';
import './Arcade.css';

export const Arcade: React.FC = () => {
  return (
    <div className="arcade-view">
      {/* Header */}
      <div className="arcade-head">
        <div>
          <h1>Arcade Zone</h1>
          <p className="arcade-sub">Pick a cabinet. Every run pays out tokens and EXP.</p>
        </div>
      </div>

      {/* Empty State Panel */}
      <div className="arcade-empty">
        <div className="arcade-empty-icon">
          <ArcadeIcon name="joystick" size={64} />
        </div>
        <h2>Arcade games are being rebuilt</h2>
        <p>New games are coming soon. Your tokens and EXP are safe.</p>
      </div>
    </div>
  );
};
