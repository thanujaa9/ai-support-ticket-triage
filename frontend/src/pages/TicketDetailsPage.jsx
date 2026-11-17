import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const TicketDetailsPage = ({ ticketId, onBack }) => {
  const { user } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [categories, setCategories] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // AI draft review state
  const [aiDraft, setAiDraft] = useState(null);
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [editedDraftText, setEditedDraftText] = useState('');
  const [feedbackReason, setFeedbackReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [triageLoading, setTriageLoading] = useState(false);

  // Thread summarization state
  const [summary, setSummary] = useState(null);
  const [summarizeLoading, setSummarizeLoading] = useState(false);

  // Comment state
  const [newComment, setNewComment] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);

  // Tab: comments vs history
  const [activeTab, setActiveTab] = useState('comments');

  const fetchTicketDetails = async () => {
    try {
      const [ticketRes, catRes, empRes] = await Promise.all([
        api.getTicket(ticketId),
        api.getCategories(),
        api.getEmployees(),
      ]);

      const t = ticketRes.ticket;
      setTicket(t);
      setCategories(catRes.categories || []);
      setEmployees(empRes.employees || []);

      if (t.latest_ai_response) {
        setAiDraft(t.latest_ai_response);
        setEditedDraftText(t.latest_ai_response.final_reply_sent || t.latest_ai_response.draft_reply || '');
      }
    } catch (err) {
      console.error('Failed to load ticket:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicketDetails();
  }, [ticketId]);

  // Update Status, Priority, Category, Assignee
  const handleUpdate = async (field, value) => {
    try {
      await api.updateTicket(ticket.id, { [field]: value });
      fetchTicketDetails();
    } catch (err) {
      alert(`Update failed: ${err.message}`);
    }
  };

  // Run AI Triage
  const handleRunTriage = async () => {
    setTriageLoading(true);
    try {
      const res = await api.triageTicket(ticket.id);
      setAiDraft(res.data.ai_response);
      setEditedDraftText(res.data.ai_response.draft_reply);
      fetchTicketDetails();
    } catch (err) {
      alert(`AI Triage failed: ${err.message}`);
    } finally {
      setTriageLoading(false);
    }
  };

  // Summarize Thread
  const handleSummarizeThread = async () => {
    setSummarizeLoading(true);
    try {
      const res = await api.summarizeThread(ticket.id);
      setSummary(res.summary);
    } catch (err) {
      alert(`Summarization failed: ${err.message}`);
    } finally {
      setSummarizeLoading(false);
    }
  };

  // Review Draft (Approve, Edit, Reject)
  const handleReviewDraft = async (status) => {
    if (!aiDraft) return;
    try {
      await api.reviewDraft(aiDraft.id, {
        status,
        final_reply: editedDraftText,
        feedback_reason: feedbackReason,
        send_as_comment: true,
      });
      setShowRejectModal(false);
      setIsEditingDraft(false);
      fetchTicketDetails();
    } catch (err) {
      alert(`Draft review failed: ${err.message}`);
    }
  };

  // Submit comment
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setCommentLoading(true);
    try {
      await api.addComment(ticket.id, {
        body: newComment.trim(),
        is_internal_note: isInternalNote,
      });
      setNewComment('');
      setIsInternalNote(false);
      fetchTicketDetails();
    } catch (err) {
      alert(`Failed to add comment: ${err.message}`);
    } finally {
      setCommentLoading(false);
    }
  };

  if (loading || !ticket) {
    return <div style={{ textAlign: 'center', padding: '4rem 0' }}>Loading ticket details...</div>;
  }

  return (
    <div>
      {/* Back button & Ticket Number Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <button className="btn-secondary" onClick={onBack}>
          ← Back to Ticket Queue
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {ticket.is_overdue && (
            <span style={{
              background: 'var(--urgent-bg)',
              color: 'var(--urgent)',
              border: '1px solid #fecaca',
              padding: '0.35rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.8rem',
              fontWeight: 700,
            }}>
              ⚠️ SLA BREACHED (Overdue)
            </span>
          )}
          <span style={{
            fontSize: '0.85rem',
            fontWeight: 600,
            color: 'var(--text-muted)',
            background: '#fff',
            padding: '0.35rem 0.75rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
          }}>
            ⏰ SLA Deadline: {new Date(ticket.sla_due_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Duplicate Warning Callout */}
      {ticket.is_duplicate && (
        <div style={{
          background: '#fffbeb',
          border: '1px solid #fde68a',
          color: '#92400e',
          padding: '1rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}>
          <span style={{ fontSize: '1.5rem' }}>⚠️</span>
          <div>
            <strong>Potential Duplicate Ticket Detected!</strong> This ticket shares strong semantic similarity with open ticket{' '}
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
              #{ticket.duplicate_of_ticket_number || `TIC-${ticket.duplicate_of_ticket_id}`}
            </span>
            {ticket.duplicate_of_ticket_subject && <span> — "{ticket.duplicate_of_ticket_subject}"</span>}.
          </div>
        </div>
      )}

      {/* Main Grid: Details Left, Customer Sidebar Right */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: '1.5rem' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Ticket Header Card */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem' }}>
                {ticket.ticket_number}
              </span>
              <span className={`badge badge-${ticket.priority}`}>
                {ticket.priority === 'urgent' && <span className="pulse-dot"></span>}
                {ticket.priority}
              </span>
              <span className={`badge badge-${ticket.status}`}>
                {ticket.status.replace(/_/g, ' ')}
              </span>
              {ticket.sentiment && (
                <span style={{ fontSize: '0.8rem', background: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                  Sentiment: {ticket.sentiment}
                </span>
              )}
            </div>

            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.75rem' }}>
              {ticket.subject}
            </h1>

            <div style={{
              background: '#f8fafc',
              padding: '1.25rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              fontSize: '0.95rem',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
            }}>
              {ticket.description}
            </div>

            {/* Quick Status and Assignment Controls */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '0.75rem',
              marginTop: '1.25rem',
              paddingTop: '1rem',
              borderTop: '1px solid var(--border)',
            }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Status</label>
                <select
                  className="form-select"
                  style={{ width: '100%', fontSize: '0.85rem' }}
                  value={ticket.status}
                  onChange={(e) => handleUpdate('status', e.target.value)}
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="waiting_on_customer">Waiting on Customer</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Priority</label>
                <select
                  className="form-select"
                  style={{ width: '100%', fontSize: '0.85rem' }}
                  value={ticket.priority}
                  onChange={(e) => handleUpdate('priority', e.target.value)}
                >
                  <option value="urgent">🚨 Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Category</label>
                <select
                  className="form-select"
                  style={{ width: '100%', fontSize: '0.85rem' }}
                  value={ticket.category_id || ''}
                  onChange={(e) => handleUpdate('category_id', e.target.value ? parseInt(e.target.value, 10) : null)}
                >
                  <option value="">Unassigned</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Assignee</label>
                <select
                  className="form-select"
                  style={{ width: '100%', fontSize: '0.85rem' }}
                  value={ticket.assigned_to || ''}
                  onChange={(e) => handleUpdate('assigned_to', e.target.value ? parseInt(e.target.value, 10) : null)}
                >
                  <option value="">Unassigned</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* AI Triage & Draft Assistant Card */}
          <div className="card" style={{ border: '2px solid #e0e7ff', background: '#fafbff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.4rem' }}>🤖</span>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>AI Support Assistant & Draft</h2>
                {aiDraft && (
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    background: aiDraft.status === 'approved' ? '#ecfdf5' : aiDraft.status === 'pending' ? '#ede9fe' : '#f1f5f9',
                    color: aiDraft.status === 'approved' ? '#047857' : aiDraft.status === 'pending' ? '#6d28d9' : '#475569',
                  }}>
                    {aiDraft.status}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}
                  onClick={handleSummarizeThread}
                  disabled={summarizeLoading}
                >
                  {summarizeLoading ? 'Summarizing...' : '📝 Summarize Thread'}
                </button>
                <button
                  className="btn-primary"
                  style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}
                  onClick={handleRunTriage}
                  disabled={triageLoading}
                >
                  {triageLoading ? 'Running AI...' : '⚡ Run AI Triage'}
                </button>
              </div>
            </div>

            {/* Thread Summary Callout */}
            {summary && (
              <div style={{
                background: '#ffffff',
                border: '1px solid #c7d2fe',
                borderRadius: 'var(--radius-sm)',
                padding: '1rem',
                marginBottom: '1rem',
                fontSize: '0.85rem',
              }}>
                <div style={{ fontWeight: 700, color: '#3730a3', marginBottom: '0.5rem' }}>
                  📌 AI Executive Thread Summary
                </div>
                <ul style={{ paddingLeft: '1.25rem', lineHeight: 1.6 }}>
                  <li><strong>Core Problem:</strong> {summary.root_issue}</li>
                  <li><strong>Progress:</strong> {summary.actions_taken}</li>
                  <li><strong>Current Blocker / Next Step:</strong> {summary.current_blocker}</li>
                </ul>
              </div>
            )}

            {/* AI Predictions & Suggestions */}
            {aiDraft ? (
              <div>
                <div style={{
                  display: 'flex',
                  gap: '1rem',
                  padding: '0.75rem 1rem',
                  background: '#ffffff',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  marginBottom: '1rem',
                  fontSize: '0.85rem',
                }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Predicted Category: </span>
                    <strong>{aiDraft.proposed_category_name || 'Technical'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Priority: </span>
                    <strong style={{ textTransform: 'capitalize' }}>{aiDraft.proposed_priority}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Confidence: </span>
                    <strong style={{ color: 'var(--success)' }}>
                      {(parseFloat(aiDraft.confidence_score || '0.9') * 100).toFixed(0)}%
                    </strong>
                  </div>
                </div>

                {/* Draft Content */}
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label className="form-label" style={{ fontSize: '0.85rem' }}>
                      Suggested Response Draft {isEditingDraft && '(Editing)'}
                    </label>
                    {!isEditingDraft && aiDraft.status === 'pending' && (
                      <button
                        className="btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                        onClick={() => setIsEditingDraft(true)}
                      >
                        ✏️ Edit Draft
                      </button>
                    )}
                  </div>

                  {isEditingDraft ? (
                    <textarea
                      className="form-textarea"
                      rows="6"
                      value={editedDraftText}
                      onChange={(e) => setEditedDraftText(e.target.value)}
                      style={{ width: '100%' }}
                    />
                  ) : (
                    <div style={{
                      background: '#ffffff',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '1rem',
                      fontSize: '0.9rem',
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                    }}>
                      {editedDraftText || aiDraft.draft_reply}
                    </div>
                  )}
                </div>

                {/* Human Review Decision Buttons */}
                {aiDraft.status === 'pending' && (
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    {isEditingDraft ? (
                      <button
                        className="btn-success"
                        onClick={() => handleReviewDraft('edited')}
                      >
                        ✅ Send Edited Reply to Customer
                      </button>
                    ) : (
                      <button
                        className="btn-success"
                        onClick={() => handleReviewDraft('approved')}
                      >
                        ✅ Approve & Send to Customer
                      </button>
                    )}

                    <button
                      className="btn-danger"
                      onClick={() => setShowRejectModal(true)}
                    >
                      ❌ Reject Draft
                    </button>

                    {isEditingDraft && (
                      <button
                        className="btn-secondary"
                        onClick={() => setIsEditingDraft(false)}
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                No AI draft has been generated for this ticket yet.
                <div style={{ marginTop: '0.5rem' }}>
                  <button className="btn-primary" onClick={handleRunTriage} disabled={triageLoading}>
                    {triageLoading ? 'Generating...' : '⚡ Generate AI First Reply'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Conversation Thread & Comments */}
          <div className="card">
            {/* Tabs: Comments vs Audit History */}
            <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', marginBottom: '1.25rem' }}>
              <button
                style={{
                  padding: '0.5rem 0.25rem',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  borderBottom: activeTab === 'comments' ? '2px solid var(--primary)' : '2px solid transparent',
                  color: activeTab === 'comments' ? 'var(--primary)' : 'var(--text-muted)',
                }}
                onClick={() => setActiveTab('comments')}
              >
                💬 Conversation Thread ({ticket.comments?.length || 0})
              </button>
              <button
                style={{
                  padding: '0.5rem 0.25rem',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  borderBottom: activeTab === 'history' ? '2px solid var(--primary)' : '2px solid transparent',
                  color: activeTab === 'history' ? 'var(--primary)' : 'var(--text-muted)',
                }}
                onClick={() => setActiveTab('history')}
              >
                📜 Audit History ({ticket.history?.length || 0})
              </button>
            </div>

            {activeTab === 'comments' ? (
              <div>
                {/* Comments List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                  {ticket.comments?.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem' }}>
                      No messages posted yet.
                    </div>
                  ) : (
                    ticket.comments?.map((c) => (
                      <div
                        key={c.id}
                        style={{
                          padding: '1rem',
                          borderRadius: 'var(--radius-sm)',
                          background: c.is_internal_note ? '#fffbeb' : '#ffffff',
                          border: c.is_internal_note ? '1px dashed #f59e0b' : '1px solid var(--border)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{c.author_name}</span>
                            <span style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px',
                              background: c.author_type === 'employee' ? '#e0e7ff' : '#f1f5f9',
                              color: c.author_type === 'employee' ? '#4338ca' : '#475569',
                            }}>
                              {c.author_type}
                            </span>
                            {c.is_internal_note && (
                              <span style={{ fontSize: '0.7rem', fontWeight: 700, background: '#fef3c7', color: '#b45309', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                                🔒 Internal Note
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                            {new Date(c.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.9rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                          {c.body}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Comment Form */}
                <form onSubmit={handleAddComment}>
                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <textarea
                      className="form-textarea"
                      rows="4"
                      placeholder="Type a response to the customer or leave an internal note..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      style={{ width: '100%' }}
                      required
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={isInternalNote}
                        onChange={(e) => setIsInternalNote(e.target.checked)}
                      />
                      <span>🔒 Post as Internal Note (Hidden from customer)</span>
                    </label>

                    <button
                      type="submit"
                      className={isInternalNote ? 'btn-secondary' : 'btn-primary'}
                      disabled={commentLoading}
                    >
                      {commentLoading ? 'Posting...' : isInternalNote ? 'Save Internal Note' : 'Send Public Reply'}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* Audit History Tab */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {ticket.history?.map((h) => (
                  <div key={h.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', fontSize: '0.85rem' }}>
                    <span style={{ fontSize: '1rem', marginTop: '0.1rem' }}>⏱️</span>
                    <div style={{ flex: 1 }}>
                      <div>
                        <strong>{h.changed_by_name || 'System / Customer'}</strong> modified{' '}
                        <code style={{ background: '#f1f5f9', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>
                          {h.field_changed}
                        </code>
                        {h.old_value && (
                          <span> from <del style={{ color: 'var(--text-light)' }}>{h.old_value}</del></span>
                        )}
                        {h.new_value && (
                          <span> to <strong style={{ color: 'var(--primary)' }}>{h.new_value}</strong></span>
                        )}
                      </div>
                      {h.reason && (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.15rem' }}>
                          Reason: {h.reason}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                      {new Date(h.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Customer Info Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>👤</span> Customer Information
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>NAME</div>
                <div style={{ fontWeight: 700 }}>{ticket.customer_name}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>EMAIL</div>
                <div style={{ wordBreak: 'break-all' }}>{ticket.customer_email}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>COMPANY</div>
                <div>{ticket.customer_company || 'Independent'}</div>
              </div>

              {ticket.customer_phone && (
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>PHONE</div>
                  <div>{ticket.customer_phone}</div>
                </div>
              )}
            </div>
          </div>

          {/* Quick SLA Details Card */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🎯</span> SLA Policy Targets
            </h3>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              <div>Priority: <strong style={{ color: 'var(--text-main)', textTransform: 'capitalize' }}>{ticket.priority}</strong></div>
              <div>Created: <strong>{new Date(ticket.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong></div>
              <div>Deadline: <strong style={{ color: ticket.is_overdue ? 'var(--urgent)' : 'inherit' }}>{new Date(ticket.sla_due_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong></div>
            </div>
          </div>
        </div>
      </div>

      {/* Reject Feedback Modal */}
      {showRejectModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
        }}>
          <div className="card" style={{ maxWidth: 450, width: '100%', margin: '1rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.75rem' }}>Reject AI Suggestion</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Provide feedback on why this AI draft was rejected. This telemetry is logged in the LLM Debugger to tune future prompt versions.
            </p>

            <textarea
              className="form-textarea"
              rows="3"
              placeholder="e.g., Inaccurate troubleshooting advice or tone too robotic..."
              value={feedbackReason}
              onChange={(e) => setFeedbackReason(e.target.value)}
              style={{ width: '100%', marginBottom: '1rem' }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button className="btn-secondary" onClick={() => setShowRejectModal(false)}>
                Cancel
              </button>
              <button className="btn-danger" onClick={() => handleReviewDraft('rejected')}>
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
