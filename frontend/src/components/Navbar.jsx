import React from 'react';
import { useAuth } from '../context/AuthContext';

export const Navbar = ({ currentTab, setCurrentTab }) => {
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <header className="navbar">
      <div className="brand" onClick={() => setCurrentTab('dashboard')} style={{ cursor: 'pointer' }}>
        <span style={{ fontSize: '1.4rem' }}>⚡</span>
        <span>AutoTriage<span style={{ color: 'var(--primary)' }}>AI</span></span>
        <span className="brand-badge">PRO</span>
      </div>

      <nav className="nav-links">
        {isAuthenticated && (
          <>
            <button
              className={`nav-item ${currentTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setCurrentTab('dashboard')}
            >
              📊 Dashboard
            </button>
            <button
              className={`nav-item ${currentTab === 'tickets' || currentTab === 'ticket-detail' ? 'active' : ''}`}
              onClick={() => setCurrentTab('tickets')}
            >
              🎫 Tickets
            </button>
            <button
              className={`nav-item ${currentTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setCurrentTab('analytics')}
            >
              📈 Analytics
            </button>
            <button
              className={`nav-item ${currentTab === 'debugger' ? 'active' : ''}`}
              onClick={() => setCurrentTab('debugger')}
            >
              🛠️ LLM Debugger
            </button>
          </>
        )}
        <button
          className={`nav-item ${currentTab === 'submit-ticket' ? 'active' : ''}`}
          onClick={() => setCurrentTab('submit-ticket')}
        >
          ➕ Submit Ticket
        </button>
      </nav>

      <div className="nav-user">
        {isAuthenticated ? (
          <>
            <div className="user-badge">
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }}></span>
              <span>{user?.name}</span>
              <span className={`role-tag ${user?.role}`}>{user?.role}</span>
            </div>
            <button className="btn-logout" onClick={logout}>
              Sign Out
            </button>
          </>
        ) : (
          <button className="btn-primary" onClick={() => setCurrentTab('login')}>
            Agent Login
          </button>
        )}
      </div>
    </header>
  );
};
