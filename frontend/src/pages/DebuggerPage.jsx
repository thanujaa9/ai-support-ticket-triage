import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export const DebuggerPage = () => {
  const [calls, setCalls] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedCall, setSelectedCall] = useState(null);

  useEffect(() => {
    const fetchCalls = async () => {
      setLoading(true);
      try {
        const res = await api.getLlmCalls({ status: statusFilter });
        setCalls(res.calls || []);
      } catch (err) {
        console.error('Failed to load LLM debug logs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCalls();
  }, [statusFilter]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>LLM Run Debugger & Observability</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Inspect raw API payloads, token consumption, latency benchmarks, and fallback executions.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Status Filter:</span>
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Executions</option>
            <option value="success">Success</option>
            <option value="fallback">Fallback (Rule Engine)</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Execution Time</th>
                <th>Ticket Reference</th>
                <th>Operation</th>
                <th>Model</th>
                <th>Latency</th>
                <th>Tokens (P / C / Tot)</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Loading LLM telemetry logs...
                  </td>
                </tr>
              ) : calls.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No telemetry records match the filter.
                  </td>
                </tr>
              ) : (
                calls.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(c.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td>
                      {c.ticket_number ? (
                        <div>
                          <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>{c.ticket_number}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {c.ticket_subject}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-light)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <code style={{ background: '#f1f5f9', padding: '0.2rem 0.4rem', borderRadius: '4px', fontSize: '0.8rem' }}>
                        {c.operation_type}
                      </code>
                    </td>
                    <td>{c.model}</td>
                    <td>
                      <span style={{
                        color: c.latency_ms > 2000 ? 'var(--urgent)' : 'inherit',
                        fontWeight: c.latency_ms > 2000 ? 700 : 500,
                      }}>
                        {c.latency_ms} ms
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
                      {c.prompt_tokens} / {c.completion_tokens} / <strong>{c.total_tokens}</strong>
                    </td>
                    <td>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        background: c.status === 'success' ? '#ecfdf5' : c.status === 'fallback' ? '#fffbeb' : '#fef2f2',
                        color: c.status === 'success' ? '#047857' : c.status === 'fallback' ? '#b45309' : '#b91c1c',
                      }}>
                        {c.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn-secondary"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                        onClick={() => setSelectedCall(c)}
                      >
                        Inspect Payload →
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payload Inspection Modal */}
      {selectedCall && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
        }}>
          <div className="card" style={{ maxWidth: 750, width: '100%', maxHeight: '85vh', overflowY: 'auto', margin: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                LLM Execution Payload (Call #{selectedCall.id})
              </h3>
              <button className="btn-secondary" onClick={() => setSelectedCall(null)}>
                ✕ Close
              </button>
            </div>

            {selectedCall.error_message && (
              <div style={{
                background: 'var(--urgent-bg)',
                color: 'var(--urgent)',
                padding: '0.75rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '1rem',
                border: '1px solid #fecaca',
              }}>
                <strong>Exception / Fallback Trigger:</strong> {selectedCall.error_message}
              </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <label className="form-label">Request Payload Sent to Model</label>
              <pre style={{
                background: '#0f172a',
                color: '#f8fafc',
                padding: '1rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                fontFamily: 'var(--font-mono)',
                overflowX: 'auto',
                maxHeight: 220,
              }}>
                {typeof selectedCall.request_payload === 'string'
                  ? selectedCall.request_payload
                  : JSON.stringify(selectedCall.request_payload, null, 2)}
              </pre>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label className="form-label">Response Payload Received</label>
              <pre style={{
                background: '#0f172a',
                color: '#34d399',
                padding: '1rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                fontFamily: 'var(--font-mono)',
                overflowX: 'auto',
                maxHeight: 220,
              }}>
                {selectedCall.response_payload
                  ? (typeof selectedCall.response_payload === 'string'
                      ? selectedCall.response_payload
                      : JSON.stringify(selectedCall.response_payload, null, 2))
                  : 'null (Executed via fallback handler)'}
              </pre>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <div>Model: <strong>{selectedCall.model}</strong></div>
              <div>Latency: <strong>{selectedCall.latency_ms} ms</strong></div>
              <div>Total Tokens: <strong>{selectedCall.total_tokens}</strong></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
