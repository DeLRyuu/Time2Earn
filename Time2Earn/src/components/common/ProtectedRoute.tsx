import React, { useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { Skeleton } from '../ui/Skeleton';
import { ForcePasswordChangeModal } from './ForcePasswordChangeModal';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'user';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
}) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();
  const hasAlertedRef = useRef(false);

  useEffect(() => {
    if (!loading && isAuthenticated && requiredRole === 'admin' && !isAdmin && !hasAlertedRef.current) {
      hasAlertedRef.current = true;
      showToast('Access Denied: Administrator privileges required.', 'error');
    }
  }, [loading, isAuthenticated, requiredRole, isAdmin, showToast]);

  if (loading) {
    return (
      <div style={{ padding: '3rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '600px', margin: '0 auto' }}>
        <Skeleton height="36px" width="50%" />
        <Skeleton height="160px" />
        <Skeleton height="80px" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole === 'admin' && !isAdmin) {
    return <Navigate to="/player" replace />;
  }

  return (
    <>
      <ForcePasswordChangeModal />
      {children}
    </>
  );
};
