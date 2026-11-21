import React, { useEffect, useState } from 'react';
import './GainFeedback.css';

export interface GainFeedbackItem {
  id: string;
  type: 'credits' | 'exp';
  amount: number;
}

export interface GainFeedbackProps {
  items: GainFeedbackItem[];
  onDismiss: (id: string) => void;
}

export const GainFeedback: React.FC<GainFeedbackProps> = ({ items, onDismiss }) => {
  return (
    <div className="gain-feedback-overlay" aria-live="polite" aria-atomic="true">
      {items.map((item) => (
        <GainFeedbackChip key={item.id} item={item} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const GainFeedbackChip: React.FC<{ item: GainFeedbackItem; onDismiss: (id: string) => void }> = ({
  item,
  onDismiss,
}) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss(item.id);
    }, 1200);

    return () => clearTimeout(timer);
  }, [item.id, onDismiss]);

  if (!visible) return null;

  const isCredits = item.type === 'credits';

  return (
    <div className={`gain-feedback-chip ${isCredits ? 'gain-credits' : 'gain-exp'}`}>
      <span>{isCredits ? '💰' : '⭐'}</span>
      <span>
        +{item.amount} {isCredits ? 'CREDITS' : 'EXP'}
      </span>
    </div>
  );
};
