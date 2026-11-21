import React, { useState, useEffect } from 'react';

export interface CooldownTimerProps {
  expiresAt: string;
  onExpire?: () => void;
  className?: string;
}

export const CooldownTimer: React.FC<CooldownTimerProps> = ({ expiresAt, onExpire, className = '' }) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  });

  useEffect(() => {
    const checkTimer = () => {
      const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
      const remaining = Math.max(0, diff);
      setSecondsLeft(remaining);
      if (remaining === 0 && onExpire) {
        onExpire();
      }
    };

    checkTimer();
    const interval = setInterval(checkTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  if (secondsLeft <= 0) {
    return <span className={className}>Ready now!</span>;
  }

  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;

  const formatted = hours > 0
    ? `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`
    : `${minutes}m ${seconds.toString().padStart(2, '0')}s`;

  return (
    <span className={className} style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
      ⏱️ {formatted}
    </span>
  );
};
