import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

export const AnalyticsPage = () => {
  const [breakdown, setBreakdown] = useState(null);
  const [agents, setAgents] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bdRes, agentRes, promptRes] = await Promise.all([
          api.getBreakdown(),
          api.getEmployeePerformance(),
          api.getPromptPerformance(),
        ]);
        setBreakdown(bdRes);
        setAgents(agentRes.agents || []);
        setPrompts(promptRes.prompts || []);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem 0' }}>Loading SQL analytics...</div>;
  }

  // Priority chart data
  const priorityLabels = breakdown?.priorities?.map((p) => p.priority.toUpperCase()) || [];
  const priorityData = breakdown?.priorities?.map((p) => parseInt(p.count, 10)) || [];

  const priorityChartConfig = {
    labels: priorityLabels,
    datasets: [
      {
        data: priorityData,
        backgroundColor: ['#ef4444', '#f97316', '#3b82f6', '#94a3b8'],
        borderWidth: 1,
      },
    ],
  };

  // Category chart data
  const categoryLabels = breakdown?.categories?.map((c) => c.category_name) || [];
  const categoryData = breakdown?.categories?.map((c) => parseInt(c.count, 10)) || [];

  const categoryChartConfig = {
    labels: categoryLabels,
    datasets: [
      {
        label: 'Tickets',
        data: categoryData,
        backgroundColor: '#4f46e5',
        borderRadius: 6,
      },
    ],
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>SQL Analytics & Operations Telemetry</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Deep-dive relational metrics powered by PostgreSQL window aggregations and date truncations.
        </p>
      </div>

      {/* Visual Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Priority Doughnut Chart */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem', width: '100%', textAlign: 'left' }}>
            🎯 Priority Distribution
          </h2>
          <div style={{ width: '80%', maxHeight: 280, position: 'relative' }}>
            <Doughnut data={priorityChartConfig} options={{ responsive: true, maintainAspectRatio: true }} />
          </div>
        </div>

        {/* Category Breakdown Bar Chart */}
        <div className="card">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem' }}>
            📂 Category Volume Breakdown
          </h2>
          <div style={{ height: 260 }}>
            <Bar
              data={categoryChartConfig}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: { beginAtZero: true, ticks: { stepSize: 1 } },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Agent Performance Leaderboard */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>🏆</span> Support Agent Performance
        </h2>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Agent Name</th>
                <th>Work Email</th>
                <th>Assigned Tickets</th>
                <th>Resolved Tickets</th>
                <th>Avg Resolution Time</th>
                <th>Overdue Count</th>
              </tr>
            </thead>
            <tbody>
              {agents.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No support agents active.
                  </td>
                </tr>
              ) : (
                agents.map((a) => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 700 }}>👤 {a.name}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{a.email}</td>
                    <td><span className="badge badge-open">{a.assigned_tickets}</span></td>
                    <td><span className="badge badge-resolved">{a.resolved_tickets}</span></td>
                    <td>{a.avg_resolution_hours ? `${a.avg_resolution_hours} hrs` : 'N/A'}</td>
                    <td>
                      {parseInt(a.overdue_tickets, 10) > 0 ? (
                        <span style={{ color: 'var(--urgent)', fontWeight: 700 }}>
                          ⚠️ {a.overdue_tickets}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--success)', fontWeight: 700 }}>0</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Prompt Governance & Version Performance */}
      <div className="card">
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>🧪</span> Prompt Version Governance & Accuracy
        </h2>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Prompt Name</th>
                <th>Version</th>
                <th>Model</th>
                <th>Purpose</th>
                <th>Drafts Generated</th>
                <th>Direct Approval Rate</th>
                <th>Total Acceptance Rate</th>
              </tr>
            </thead>
            <tbody>
              {prompts.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No prompt version telemetry logged yet.
                  </td>
                </tr>
              ) : (
                prompts.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 700 }}>{p.name}</td>
                    <td><code style={{ background: '#f1f5f9', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>v{p.version}</code></td>
                    <td>{p.model}</td>
                    <td style={{ textTransform: 'capitalize' }}>{p.purpose.replace(/_/g, ' ')}</td>
                    <td>{p.total_drafts}</td>
                    <td>
                      <strong style={{ color: 'var(--primary)' }}>
                        {p.direct_approval_rate_pct || '0'}%
                      </strong>
                    </td>
                    <td>
                      <strong style={{ color: 'var(--success)' }}>
                        {p.acceptance_rate_pct || '0'}%
                      </strong>
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
