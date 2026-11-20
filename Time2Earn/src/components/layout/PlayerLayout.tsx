import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import './PlayerLayout.css';

export const PlayerLayout: React.FC = () => {
  return (
    <div className="player-shell">
      <Sidebar isAdmin={false} />
      <div className="shell-main">
        <Header isAdmin={false} />
        <main className="shell-content">
          <div className="container">
            <Outlet />
          </div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
};
