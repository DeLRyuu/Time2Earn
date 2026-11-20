import React from 'react';
import './ProgressBar.css';

export interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  subLabel?: string;
  variant?: 'primary' | 'gold' | 'success' | 'purple';
  size?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max,
  label,
  subLabel,
  variant = 'primary',
  size = 'md',
  showPercentage = false,
}) => {
  const safeMax = max > 0 ? max : 1;
  const percentage = Math.min(100, Math.max(0, Math.round((value / safeMax) * 100)));

  return (
    <div className={`progress-container size-${size}`}>
      {(label || showPercentage || subLabel) && (
        <div className="progress-labels">
          <div className="label-left">
            {label && <span className="progress-title">{label}</span>}
            {subLabel && <span className="progress-subtitle">{subLabel}</span>}
          </div>
          {showPercentage && <span className="progress-percent">{percentage}%</span>}
        </div>
      )}
      <div className="progress-track" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
        <div
          className={`progress-fill variant-${variant}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
