import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PlayerLayout } from './components/layout/PlayerLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { ProtectedRoute } from './components/common/ProtectedRoute';

// Player Pages
import { Home } from './pages/player/Home';
import { Rewards } from './pages/player/Rewards';
import { Arcade } from './pages/player/Arcade';
import { Leaderboard } from './pages/player/Leaderboard';
import { Profile } from './pages/player/Profile';
import { UtangPage } from './pages/player/UtangPage';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminSessions } from './pages/admin/AdminSessions';
import { AdminRedemptions } from './pages/admin/AdminRedemptions';
import { AdminDebts } from './pages/admin/AdminDebts';
import { AdminRewards } from './pages/admin/AdminRewards';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminLogs } from './pages/admin/AdminLogs';
import { AdminSettings } from './pages/admin/AdminSettings';

// Auth & Fallbacks
import { Login } from './pages/auth/Login';
import { QrEntry } from './pages/QrEntry';
import { NotFound } from './pages/NotFound';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing redirects to Player Home */}
        <Route path="/" element={<Navigate to="/player" replace />} />

        {/* Public Auth & QR Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/qr" element={<QrEntry />} />

        {/* Player Section with Route Guard */}
        <Route
          path="/player"
          element={
            <ProtectedRoute requiredRole="user">
              <PlayerLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Home />} />
          <Route path="rewards" element={<Rewards />} />
          <Route path="arcade" element={<Arcade />} />
          <Route path="leaderboard" element={<Leaderboard />} />
          <Route path="profile" element={<Profile />} />
          <Route path="/player/utang" element={<UtangPage />} />
        </Route>

        {/* Admin Section with Strict Admin Guard */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="sessions" element={<AdminSessions />} />
          <Route path="redemptions" element={<AdminRedemptions />} />
          <Route path="debts" element={<AdminDebts />} />
          <Route path="rewards" element={<AdminRewards />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="logs" element={<AdminLogs />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        {/* 404 Route */}
        <Route path="*" element={<NotFound />} />

        

      </Routes>
    </BrowserRouter>
  );
}

export default App;
