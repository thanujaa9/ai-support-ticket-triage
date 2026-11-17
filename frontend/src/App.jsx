import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { TicketsListPage } from './pages/TicketsListPage';
import { TicketDetailsPage } from './pages/TicketDetailsPage';
import { SubmitTicketPage } from './pages/SubmitTicketPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { DebuggerPage } from './pages/DebuggerPage';

function MainApp() {
  const { isAuthenticated, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [selectedTicketId, setSelectedTicketId] = useState(null);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', color: 'var(--text-muted)' }}>
        Initializing AutoTriage AI platform...
      </div>
    );
  }

  // Handle ticket selection
  const handleSelectTicket = (id) => {
    setSelectedTicketId(id);
    setCurrentTab('ticket-detail');
  };

  const renderContent = () => {
    // If not authenticated and trying to access employee pages, redirect to login
    if (!isAuthenticated && currentTab !== 'submit-ticket') {
      return <LoginPage onSuccess={() => setCurrentTab('dashboard')} />;
    }

    switch (currentTab) {
      case 'dashboard':
        return (
          <DashboardPage
            onSelectTicket={handleSelectTicket}
            onNavigate={(tab) => setCurrentTab(tab)}
          />
        );
      case 'tickets':
        return (
          <TicketsListPage
            onSelectTicket={handleSelectTicket}
            onNewTicket={() => setCurrentTab('submit-ticket')}
          />
        );
      case 'ticket-detail':
        return (
          <TicketDetailsPage
            ticketId={selectedTicketId}
            onBack={() => setCurrentTab('tickets')}
          />
        );
      case 'analytics':
        return <AnalyticsPage />;
      case 'debugger':
        return <DebuggerPage />;
      case 'submit-ticket':
        return (
          <SubmitTicketPage
            onViewTicket={(id) => {
              if (isAuthenticated) {
                handleSelectTicket(id);
              } else {
                alert(`Ticket created! Reference: #${id}. Log in as support staff to view full triage.`);
                setCurrentTab('dashboard');
              }
            }}
          />
        );
      case 'login':
        return <LoginPage onSuccess={() => setCurrentTab('dashboard')} />;
      default:
        return <DashboardPage onSelectTicket={handleSelectTicket} onNavigate={setCurrentTab} />;
    }
  };

  return (
    <div className="app-container">
      <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} />
      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
