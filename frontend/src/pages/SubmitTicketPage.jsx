import React, { useState } from 'react';
import { api } from '../services/api';

export const SubmitTicketPage = ({ onViewTicket }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    subject: '',
    description: '',
  });

  const [loading, setLoading] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState(null);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.createTicket(formData);
      setSubmittedTicket(res.ticket);
      setDuplicateWarning(res.duplicate_warning);
    } catch (err) {
      setError(err.message || 'Failed to submit ticket.');
    } finally {
      setLoading(false);
    }
  };

  if (submittedTicket) {
    return (
      <div style={{ maxWidth: 600, margin: '3rem auto' }}>
        <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Support Request Received!
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Your ticket has been logged and queued for AI automated triage and agent response.
          </p>

          <div style={{
            background: '#f8fafc',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '1.25rem',
            marginBottom: '1.5rem',
            display: 'inline-block',
          }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>TICKET REFERENCE NUMBER</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
              {submittedTicket.ticket_number}
            </div>
          </div>

          {duplicateWarning && (
            <div style={{
              background: '#fffbeb',
              border: '1px solid #fde68a',
              color: '#92400e',
              padding: '1rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              textAlign: 'left',
              marginBottom: '1.5rem',
            }}>
              <strong>⚠️ Duplicate Notice:</strong> An open ticket with similar subject ({duplicateWarning.ticket_number}: "{duplicateWarning.matched_subject}") is already under investigation. Our team will consolidate updates into one thread.
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
            <button
              className="btn-secondary"
              onClick={() => {
                setSubmittedTicket(null);
                setDuplicateWarning(null);
                setFormData({ name: '', email: '', company: '', phone: '', subject: '', description: '' });
              }}
            >
              Submit Another Request
            </button>
            <button
              className="btn-primary"
              onClick={() => onViewTicket(submittedTicket.id)}
            >
              View Ticket Details →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 680, margin: '2rem auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Submit Support Request</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Encountering an issue? Submit details below and our AI support system will prioritize and route your request.
        </p>
      </div>

      <div className="card">
        {error && (
          <div style={{
            background: 'var(--urgent-bg)',
            color: 'var(--urgent)',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            fontWeight: 600,
            marginBottom: '1.25rem',
            border: '1px solid #fecaca',
          }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Your Full Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. John Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Work Email</label>
              <input
                type="email"
                className="form-input"
                placeholder="john@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Company Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Acme Corp"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number (Optional)</label>
              <input
                type="tel"
                className="form-input"
                placeholder="+1-555-0100"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Subject / Issue Summary</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Double charged for annual subscription renewal"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Detailed Description</label>
            <textarea
              className="form-textarea"
              rows="6"
              placeholder="Provide exact symptoms, error messages, invoice numbers or steps to reproduce..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', padding: '0.85rem', fontSize: '1rem' }}
            disabled={loading}
          >
            {loading ? 'Submitting & Analyzing with AI...' : 'Submit Support Ticket'}
          </button>
        </form>
      </div>
    </div>
  );
};
