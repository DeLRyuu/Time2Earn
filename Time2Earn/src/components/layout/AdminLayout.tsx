import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import './AdminLayout.css';

export const AdminLayout: React.FC = () => {
  return (
    <div className="admin-shell">
      <Sidebar isAdmin={true} />
      <main className="app-main">
        <Header isAdmin={true} />
        <div className="pad">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
