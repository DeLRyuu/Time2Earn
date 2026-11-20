import React from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../hooks/useToast';

export const Rewards: React.FC = () => {
  const { showToast } = useToast();

  const categories = ['ALL REWARDS', 'PLAY-TIME', 'SNACK-PACK', 'GAME TOP-UP'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900 }}>REWARD LOOT SHOP</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Exchange earned credits for playtime, snacks, and game top-ups.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
        {categories.map((cat, idx) => (
          <Badge
            key={cat}
            variant={idx === 0 ? 'primary' : 'neutral'}
            style={{ cursor: 'pointer', padding: '0.45rem 0.85rem' }}
            onClick={() => showToast(`Category filtered: ${cat}`, 'info')}
          >
            {cat}
          </Badge>
        ))}
      </div>

      <Card variant="default">
        <EmptyState
          icon={<span>🎁</span>}
          title="REWARDS CATALOG SKELETON"
          description="Interactive rewards shop and cooldown locks will be connected in Phase 6."
          actionText="Browse Demo Items"
          onAction={() => showToast('Connecting to Firestore rewards in Phase 6', 'info')}
        />
      </Card>
    </div>
  );
};
