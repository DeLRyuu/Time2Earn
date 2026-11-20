import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import './AdminLayout.css';

export const AdminLayout: React.FC = () => {
  return (
    <div className="admin-shell">
      <Sidebar isAdmin={true} />
      <div className="shell-main">
        <Header isAdmin={true} />
        <main className="shell-content admin-content">
          <div className="container">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
