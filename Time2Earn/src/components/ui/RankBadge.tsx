import React from 'react';
import { getRankIcon, getRankClass } from '../../lib/rankIcons';
import './RankBadge.css';

export interface RankBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  rank: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const RankBadge: React.FC<RankBadgeProps> = ({
  rank,
  size = 'md',
  showIcon = true,
  className = '',
  ...props
}) => {
  const icon = getRankIcon(rank);
  const tierClass = getRankClass(rank);

  return (
    <span
      className={`rank-badge ${tierClass} rank-badge-${size} ${className}`}
      title={`Rank: ${rank}`}
      {...props}
    >
      {showIcon && <span className="rank-icon" aria-hidden="true">{icon}</span>}
      <span>{rank}</span>
    </span>
  );
};
