import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import './PlayerLayout.css';

export const PlayerLayout: React.FC = () => {
  return (
    <div className="player-shell">
      <Sidebar isAdmin={false} />
      <main className="app-main">
        <Header isAdmin={false} />
        <div className="pad">
          <Outlet />
        </div>
      </main>
    </div>
  );
};