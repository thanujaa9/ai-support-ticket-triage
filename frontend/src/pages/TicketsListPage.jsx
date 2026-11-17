import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export const TicketsListPage = ({ onSelectTicket, onNewTicket }) => {
  const [tickets, setTickets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & State
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [categoryId, setCategoryId] = useState('all');
  const [assignedTo, setAssignedTo] = useState('all');
  const [isOverdue, setIsOverdue] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [sortBy, setSortBy] = useState('created_at');
  const [order, setOrder] = useState('DESC');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTickets, setTotalTickets] = useState(0);

  // Load Categories & Employees for filter dropdowns
  useEffect(() => {
    Promise.all([api.getCategories(), api.getEmployees()])
      .then(([catRes, empRes]) => {
        setCategories(catRes.categories || []);
        setEmployees(empRes.employees || []);
      })
      .catch((err) => console.error('Failed to load filter metadata:', err));
  }, []);

  // Fetch Tickets on filter change
  useEffect(() => {
    const fetchTickets = async () => {
      setLoading(true);
      try {
        const params = {
          page,
          limit: 10,
          sort_by: sortBy,
          order,
        };
        if (search) params.search = search;
        if (status !== 'all') params.status = status;
        if (priority !== 'all') params.priority = priority;
        if (categoryId !== 'all') params.category_id = categoryId;
        if (assignedTo !== 'all') params.assigned_to = assignedTo;
        if (isOverdue) params.is_overdue = 'true';
        if (isDuplicate) params.is_duplicate = 'true';

        const res = await api.getTickets(params);
        setTickets(res.tickets || []);
        setTotalPages(res.totalPages || 1);
        setTotalTickets(res.total || 0);
      } catch (err) {
        console.error('Failed to fetch tickets:', err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchTickets, 250);
    return () => clearTimeout(timer);
  }, [search, status, priority, categoryId, assignedTo, isOverdue, isDuplicate, sortBy, order, page]);

  const getSentimentIcon = (sentiment) => {
    switch (sentiment) {
      case 'positive': return '😊';
      case 'urgent': return '🔥';
      case 'negative': return '😠';
      default: return '😐';
    }
  };

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Support Tickets Queue</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Filter, search, review AI triage recommendations and manage agent assignments.
          </p>
        </div>
        <button className="btn-primary" onClick={onNewTicket}>
          ➕ New Support Ticket
        </button>
      </div>

      {/* Filter Toolbar Card */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
          {/* Search Input */}
          <div style={{ gridColumn: 'span 2' }}>
            <input
              type="text"
              className="form-input"
              style={{ width: '100%' }}
              placeholder="🔍 Search by ticket #, subject or keyword..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          {/* Status Filter */}
          <select className="form-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="waiting_on_customer">Waiting on Customer</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          {/* Priority Filter */}
          <select className="form-select" value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }}>
            <option value="all">All Priorities</option>
            <option value="urgent">🚨 Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Category Filter */}
          <select className="form-select" value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}>
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Assignee Filter */}
          <select className="form-select" value={assignedTo} onChange={(e) => { setAssignedTo(e.target.value); setPage(1); }}>
            <option value="all">All Assignees</option>
            <option value="unassigned">Unassigned</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>

        {/* Toggles & Sort Options */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isOverdue}
                onChange={(e) => { setIsOverdue(e.target.checked); setPage(1); }}
              />
              <span style={{ color: isOverdue ? 'var(--urgent)' : 'inherit' }}>⏰ Overdue SLA Only</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isDuplicate}
                onChange={(e) => { setIsDuplicate(e.target.checked); setPage(1); }}
              />
              <span style={{ color: isDuplicate ? 'var(--warning)' : 'inherit' }}>⚠️ Duplicates Only</span>
            </label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Sort by:</span>
            <select
              className="form-select"
              style={{ padding: '0.35rem 0.6rem', fontSize: '0.85rem' }}
              value={`${sortBy}-${order}`}
              onChange={(e) => {
                const [sb, ord] = e.target.value.split('-');
                setSortBy(sb);
                setOrder(ord);
              }}
            >
              <option value="created_at-DESC">Newest First</option>
              <option value="created_at-ASC">Oldest First</option>
              <option value="priority-ASC">Priority (Urgent first)</option>
              <option value="sla_due_at-ASC">SLA Target (Earliest first)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Subject & Sentiment</th>
                <th>Customer / Company</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Assignee</th>
                <th>AI Triage</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Fetching tickets...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No tickets match your filter criteria.
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary)' }}>
                      {t.ticket_number}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span title={`Sentiment: ${t.sentiment || 'neutral'}`}>{getSentimentIcon(t.sentiment)}</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{t.subject}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        💬 {t.comment_count} comments
                        {t.is_duplicate && (
                          <span style={{ marginLeft: '0.5rem', color: 'var(--warning)', fontWeight: 700 }}>
                            ⚠️ Duplicate
                          </span>
                        )}
                        {t.is_overdue && (
                          <span style={{ marginLeft: '0.5rem', color: 'var(--urgent)', fontWeight: 700 }}>
                            ⏰ Breached SLA
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{t.customer_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.customer_company || 'Independent'}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem' }}>{t.category_name || 'Unassigned'}</span>
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
                      <span style={{ fontSize: '0.85rem', color: t.assigned_to_name ? 'var(--text-main)' : 'var(--text-light)', fontWeight: 500 }}>
                        {t.assigned_to_name ? `👤 ${t.assigned_to_name}` : 'Unassigned'}
                      </span>
                    </td>
                    <td>
                      {t.ai_draft_status ? (
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          background: t.ai_draft_status === 'approved' ? '#ecfdf5' : t.ai_draft_status === 'pending' ? '#f5f3ff' : '#f1f5f9',
                          color: t.ai_draft_status === 'approved' ? '#047857' : t.ai_draft_status === 'pending' ? '#7c3aed' : '#475569',
                        }}>
                          {t.ai_draft_status === 'pending' ? '🤖 Draft Ready' : t.ai_draft_status}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn-secondary"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                        onClick={() => onSelectTicket(t.id)}
                      >
                        Manage →
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Showing {tickets.length} of {totalTickets} total tickets (Page {page} of {totalPages})
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn-secondary"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ← Previous
            </button>
            <button
              className="btn-secondary"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
