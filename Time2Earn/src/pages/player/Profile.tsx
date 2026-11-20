import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../hooks/useToast';

export const Profile: React.FC = () => {
  const { showToast } = useToast();
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 900 }}>PLAYER PROFILE</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Account credentials, debt balance, and staff-assisted support.
        </p>
      </div>

      <Card variant="neon" header={<span>ACCOUNT INFORMATION</span>}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>USERNAME</div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>lois_123xx</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>CURRENT RANK</div>
            <div style={{ marginTop: '0.25rem' }}><Badge variant="gold" size="sm">Gamer</Badge></div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>SPENDABLE CREDITS</div>
            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>332 CR</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>LIFETIME EXP</div>
            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--accent-gold)', fontFamily: 'var(--font-mono)' }}>1,251 EXP</div>
          </div>
        </div>
      </Card>

      <Card
        variant="default"
        header={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <span>SHOP DEBT ACCOUNT</span>
            <Badge variant="success" size="sm">CLEAR (₱0.00)</Badge>
          </div>
        }
        footer={
          <Button variant="secondary" size="sm" onClick={() => setIsDebtModalOpen(true)}>
            Pay Debt with Credits
          </Button>
        }
      >
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          You have no outstanding shop debts. When debts occur, payments can be made with credits at ₱0.40/credit (rateUsed: 0.4).
        </p>
      </Card>

      <Card variant="default" header={<span>SECURITY & PASSWORD</span>}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
          Time2Earn uses secure staff-assisted password resets to safeguard player accounts. If you forgot your password or need a credential change, request assistance directly at the shop counter.
        </p>
        <Button variant="ghost" size="sm" onClick={() => showToast('Inquire at front desk for staff-assisted reset.', 'info')}>
          Request Staff-Assisted Reset Info
        </Button>
      </Card>

      <Modal
        isOpen={isDebtModalOpen}
        onClose={() => setIsDebtModalOpen(false)}
        title="PAY DEBT WITH CREDITS"
        footer={
          <Button variant="primary" onClick={() => { setIsDebtModalOpen(false); showToast('Debt payment request feature connects in Phase 7.', 'info'); }}>
            Submit Request
          </Button>
        }
      >
        <p>Debt payment with credits applies a conversion rate of <strong>₱0.40 per credit</strong>.</p>
        <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>
          This interface connects to Firestore debt_payment_requests in Phase 7.
        </p>
      </Modal>
    </div>
  );
};
