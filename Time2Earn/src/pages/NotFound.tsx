import React from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Link } from 'react-router-dom';

export const NotFound: React.FC = () => {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh', padding: '2rem' }}>
      <Card variant="neon" style={{ textAlign: 'center', maxWidth: '440px', padding: '2rem 1.5rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>👾</div>
        <h1 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--danger)', marginBottom: '0.5rem' }}>404</h1>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.75rem' }}>AREA NOT FOUND</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          The requested coordinate does not exist in the Time2Earn grid.
        </p>
        <Link to="/player">
          <Button variant="primary" size="md">RETURN TO BASE</Button>
        </Link>
      </Card>
    </div>
  );
};
