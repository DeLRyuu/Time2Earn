import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../hooks/useToast';
import { usePwaInstall } from '../lib/pwa';
import { generateQrMatrix, matrixToSvgPath } from '../lib/qr';

export const QrEntry: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { isInstallable, isInstalled, promptInstall } = usePwaInstall();

  // Target URL defaults to current origin or fallback
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://time2earn.shop';
  const qrMatrix = generateQrMatrix(siteUrl);
  const matrixSize = qrMatrix.length + 8; // Including 4 modules quiet zone margin on each side
  const svgPath = matrixToSvgPath(qrMatrix);

  const [copied, setCopied] = useState<boolean>(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(siteUrl);
      setCopied(true);
      showToast('Site URL copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Could not copy link.', 'error');
    }
  };

  const handleInstallClick = async () => {
    const outcome = await promptInstall();
    if (outcome === 'accepted') {
      showToast('Time2Earn installed successfully!', 'success');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        background: 'radial-gradient(circle at 50% 20%, rgba(134, 59, 255, 0.15) 0%, #080b11 70%)',
      }}
    >
      <div style={{ maxWidth: '480px', width: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Brand Banner */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '2rem' }}>⚡</span>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '0.05em', margin: 0 }}>
              TIME2EARN
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Play • Earn • Rank Up • Redeem
          </p>
        </div>

        {/* QR Showcase Card */}
        <Card variant="interactive">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Badge variant="gold">SHOP DESK QR</Badge>
              {isInstalled && <Badge variant="success">APP INSTALLED</Badge>}
            </div>

            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, textAlign: 'center' }}>
              Scan on Your Phone
            </h2>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', margin: 0 }}>
              Open your phone camera to scan this QR code, open Time2Earn, and claim your PC session tokens.
            </p>

            {/* High-Contrast Scannable QR Frame */}
            <div
              style={{
                background: '#ffffff',
                padding: '1rem',
                borderRadius: '16px',
                boxShadow: '0 0 25px rgba(0, 255, 204, 0.25), 0 8px 16px rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                viewBox={`0 0 ${matrixSize} ${matrixSize}`}
                width="220"
                height="220"
                shapeRendering="crispEdges"
                style={{ display: 'block' }}
                aria-label="Time2Earn QR Code"
              >
                <rect width={matrixSize} height={matrixSize} fill="#ffffff" />
                <path d={svgPath} fill="#080b11" />
              </svg>
            </div>

            {/* Site URL Preview */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                background: 'rgba(255, 255, 255, 0.04)',
                padding: '0.6rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                fontSize: '0.85rem',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '0.5rem' }}>
                {siteUrl}
              </span>
              <button
                type="button"
                onClick={handleCopyLink}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-primary)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  padding: '0.2rem 0.4rem',
                }}
              >
                {copied ? 'COPIED!' : 'COPY'}
              </button>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', width: '100%' }}>
              <Button
                variant="primary"
                size="lg"
                onClick={() => navigate('/player')}
                style={{ width: '100%', minHeight: '48px', fontWeight: 800 }}
              >
                🚀 OPEN TIME2EARN APP
              </Button>

              {isInstallable && !isInstalled && (
                <Button
                  variant="arcade"
                  size="md"
                  onClick={handleInstallClick}
                  style={{ width: '100%', minHeight: '44px', fontWeight: 700 }}
                >
                  📱 INSTALL AS PWA APP
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Instructions Card */}
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
            <div style={{ fontWeight: 800, color: 'var(--color-primary)' }}>
              HOW TO USE AT SHOP COMPUTERS:
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <span>1️⃣</span>
              <span>Point your mobile camera at the QR code and tap the link to open Time2Earn.</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <span>2️⃣</span>
              <span>Tap <strong>Add to Home screen</strong> in Chrome/Safari for 1-tap instant loyalty access.</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <span>3️⃣</span>
              <span>Enter your PC Unit ID and paid amount after gaming to claim Tokens & EXP!</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
