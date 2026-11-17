import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export const DashboardPage = ({ onSelectTicket, onNavigate }) => {
  const [metrics, setMetrics] = useState(null);
  const [urgentTickets, setUrgentTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [overviewRes, ticketsRes] = await Promise.all([
          api.getOverviewMetrics(),
          api.getTickets({ status: 'open', limit: 5, sort_by: 'priority', order: 'ASC' }),
        ]);
        setMetrics(overviewRes.kpis);
        setUrgentTickets(ticketsRes.tickets || []);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
        Loading support operations dashboard...
      </div>
    );
  }

  const kpis = [
    {
      label: 'Open Active Tickets',
      value: metrics?.open_tickets || '0',
      badge: `${metrics?.total_tickets || 0} Total`,
      color: '#4f46e5',
      bg: '#eef2ff',
      icon: '🎫',
    },
    {
      label: 'SLA Overdue Breaches',
      value: metrics?.overdue_tickets || '0',
      badge: 'Action Needed',
      color: '#ef4444',
      bg: '#fef2f2',
      icon: '⏰',
      alert: parseInt(metrics?.overdue_tickets || 0, 10) > 0,
    },
    {
      label: 'Avg Resolution Time',
      value: `${metrics?.avg_resolution_hours || '0.0'}h`,
      badge: 'Target: < 24h',
      color: '#10b981',
      bg: '#ecfdf5',
      icon: '⚡',
    },
    {
      label: 'AI Draft Approval Rate',
      value: `${metrics?.acceptance_rate_pct || '0'}%`,
      badge: `${metrics?.total_drafts || 0} Drafts`,
      color: '#8b5cf6',
      bg: '#f5f3ff',
      icon: '🤖',
    },
    {
      label: 'Detected Duplicates',
      value: metrics?.duplicate_tickets || '0',
      badge: 'PostgreSQL Trigram',
      color: '#f59e0b',
      bg: '#fffbeb',
      icon: '🔍',
    },
  ];

  return (
    <div>
      {/* Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Support Operations Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Real-time ticket triage, automated SLA tracking, and AI suggestion telemetry.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-secondary" onClick={() => onNavigate('debugger')}>
            🛠️ LLM Debugger
          </button>
          <button className="btn-primary" onClick={() => onNavigate('tickets')}>
            View All Tickets →
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem',
      }}>
        {kpis.map((kpi, idx) => (
          <div key={idx} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1.5rem' }}>{kpi.icon}</span>
              <span style={{
                background: kpi.bg,
                color: kpi.color,
                padding: '0.2rem 0.5rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}>
                {kpi.badge}
              </span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: kpi.alert ? 'var(--urgent)' : 'var(--text-main)' }}>
              {kpi.value}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              {kpi.label}
            </div>
          </div>
        ))}
      </div>

      {/* Priority Action Queue */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🚨</span> High Priority & Urgent Queue
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Open tickets requiring immediate agent triage or SLA intervention
            </p>
          </div>
          <button className="btn-secondary" style={{ fontSize: '0.85rem' }} onClick={() => onNavigate('tickets')}>
            See full queue ({metrics?.open_tickets || 0})
          </button>
        </div>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ticket #</th>
                <th>Subject & Category</th>
                <th>Customer</th>
                <th>Priority</th>
                <th>Status</th>
                <th>SLA Target</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {urgentTickets.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    🎉 No pending urgent tickets! Support queue is clear.
                  </td>
                </tr>
              ) : (
                urgentTickets.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary)' }}>
                      {t.ticket_number}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.15rem' }}>
                        {t.subject}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {t.category_name || 'General Inquiry'}
                        {t.is_duplicate && (
                          <span style={{ marginLeft: '0.5rem', color: 'var(--warning)', fontWeight: 700 }}>
                            ⚠️ Duplicate
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{t.customer_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.customer_company || 'Independent'}</div>
                    </td>
                    <td>
                      <span className={`badge badge-${t.priority}`}>
                        {t.priority === 'urgent' && <span className="pulse-dot"></span>}
                        {t.priority}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${t.status}`}>
                        {t.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      {t.is_overdue ? (
                        <span style={{ color: 'var(--urgent)', fontWeight: 700, fontSize: '0.8rem' }}>
                          ⚠️ Overdue
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {new Date(t.sla_due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn-primary"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                        onClick={() => onSelectTicket(t.id)}
                      >
                        Open Triage →
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
