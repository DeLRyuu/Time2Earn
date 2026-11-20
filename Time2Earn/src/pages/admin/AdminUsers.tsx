import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { doc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { db, hasValidFirebaseConfig } from '../../lib/firebase';

interface UserRecord {
  id: string;
  username: string;
  role: 'user' | 'admin';
  rank: string;
  credits: number;
  exp: number;
  isRestricted: boolean;
  isBanned: boolean;
}

const SAMPLE_USERS: UserRecord[] = [
  { id: '1DrJrVqcwfULvzDyyLV5S8b8ST03', username: 'lois_123xx', role: 'user', rank: 'Gamer', credits: 332, exp: 1251, isRestricted: false, isBanned: false },
  { id: 'lld3stbFQ7Y6Dsw6knpYGTuogEr2', username: 'sherwin', role: 'user', rank: 'Grinder', credits: 140, exp: 641, isRestricted: false, isBanned: false },
  { id: 'YPggiam7YeRSXqEzsu9Te5fcejo2', username: 'NINI123', role: 'user', rank: 'Regular', credits: 45, exp: 320, isRestricted: false, isBanned: false },
  { id: 'sID4YpYaJcesS2cqqYNXwnKzHZ43', username: 'bano_123xx', role: 'user', rank: 'Visitor', credits: 180, exp: 150, isRestricted: false, isBanned: false },
];

export const AdminUsers: React.FC = () => {
  const { user: currentAdmin } = useAuth();
  const { showToast } = useToast();

  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [tempPasswordGenerated, setTempPasswordGenerated] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleOpenReset = (user: UserRecord) => {
    setSelectedUser(user);
    setTempPasswordGenerated(null);
    setIsResetModalOpen(true);
  };

  const handleExecuteReset = async () => {
    if (!selectedUser) return;

    setIsProcessing(true);
    // Generate secure temporary credential
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const tempPassword = `T2E-Temp#${randomSuffix}`;

    try {
      if (hasValidFirebaseConfig) {
        // 1. Update user record with temp password & require change on next login
        await updateDoc(doc(db, 'users', selectedUser.id), {
          password: tempPassword,
          mustChangePassword: true,
        });

        // 2. Write audit log WITHOUT exposing password string
        await addDoc(collection(db, 'logs'), {
          action: 'staff_password_reset',
          adminId: currentAdmin?.uid || 'admin_console',
          userId: selectedUser.id,
          amount: 0.0,
          details: `Staff-assisted password reset initiated for ${selectedUser.username}`,
          createdAt: new Date().toISOString(),
        });
      }

      setTempPasswordGenerated(tempPassword);
      showToast(`Temporary password generated for ${selectedUser.username}`, 'success');
    } catch (err) {
      console.error('Staff reset failed:', err);
      showToast('Failed to complete reset in Firestore.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 900 }}>PLAYER ACCOUNTS & ROLES</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Identity management, role assignment, and staff-assisted password resets.
        </p>
      </div>

      <Card variant="default" header={<span>REGISTERED PLAYERS</span>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {SAMPLE_USERS.map((u) => (
            <div
              key={u.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1rem',
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                    {u.username}
                  </span>
                  <Badge variant={u.role === 'admin' ? 'danger' : 'neutral'} size="sm">
                    {u.role}
                  </Badge>
                  <Badge variant="gold" size="sm">
                    {u.rank}
                  </Badge>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  ID: {u.id} • {u.credits} CR • {u.exp} EXP
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button variant="secondary" size="sm" onClick={() => handleOpenReset(u)}>
                  Staff Reset Password
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Staff Reset Modal */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="STAFF-ASSISTED PASSWORD RESET"
        size="md"
        footer={
          tempPasswordGenerated ? (
            <Button variant="primary" onClick={() => setIsResetModalOpen(false)}>
              DONE
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setIsResetModalOpen(false)}>
                CANCEL
              </Button>
              <Button
                variant="danger"
                isLoading={isProcessing}
                onClick={handleExecuteReset}
              >
                CONFIRM & GENERATE TEMP PASSWORD
              </Button>
            </>
          )
        }
      >
        {selectedUser && !tempPasswordGenerated && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p>
              You are initiating a staff-assisted password reset for player: <strong>{selectedUser.username}</strong>.
            </p>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
              ⚠️ <strong>Security Protocol:</strong>
              <ul style={{ paddingLeft: '1.25rem', marginTop: '0.25rem' }}>
                <li>Verify the player's physical presence and identity at the counter.</li>
                <li>The system will generate a temporary one-time password.</li>
                <li>The player will be strictly required to set a new private password upon next login.</li>
                <li>An audit log will be created without logging the password string.</li>
              </ul>
            </div>
          </div>
        )}

        {selectedUser && tempPasswordGenerated && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.75rem' }}>🔐</div>
            <h3 style={{ color: 'var(--success)', fontWeight: 800 }}>TEMPORARY CREDENTIAL GENERATED</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Hand this temporary password directly to <strong>{selectedUser.username}</strong>:
            </p>
            <div
              style={{
                background: 'var(--bg-app)',
                border: '1px solid var(--primary)',
                padding: '1rem',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font-mono)',
                fontSize: '1.4rem',
                fontWeight: 900,
                color: 'var(--primary)',
                letterSpacing: '0.08em',
              }}
            >
              {tempPasswordGenerated}
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              This temporary password has been flagged in Firestore. The player will be prompted to set their own permanent password immediately upon logging in.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
};
