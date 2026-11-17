const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('triage_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && !endpoint.includes('/auth/login')) {
      localStorage.removeItem('triage_token');
      localStorage.removeItem('triage_user');
      window.dispatchEvent(new Event('auth-expired'));
    }
    const err = new Error(data.error || 'Request failed');
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  // Auth
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  getMe: () => request('/auth/me'),
  getEmployees: () => request('/auth/employees'),

  // Tickets
  getTickets: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/tickets?${qs}`);
  },
  getTicket: (id) => request(`/tickets/${id}`),
  createTicket: (ticketData) => request('/tickets', { method: 'POST', body: JSON.stringify(ticketData) }),
  updateTicket: (id, updates) => request(`/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }),
  assignTicket: (id, assigned_to) => request(`/tickets/${id}/assign`, { method: 'POST', body: JSON.stringify({ assigned_to }) }),
  addComment: (ticketId, commentData) => request(`/tickets/${ticketId}/comments`, { method: 'POST', body: JSON.stringify(commentData) }),
  getComments: (ticketId) => request(`/tickets/${ticketId}/comments`),
  getHistory: (ticketId) => request(`/tickets/${ticketId}/history`),

  // Categories & SLA
  getCategories: () => request('/categories'),
  getSlaPolicies: () => request('/sla'),

  // AI & LLM Engine
  triageTicket: (ticketId) => request(`/ai/tickets/${ticketId}/triage`, { method: 'POST' }),
  reviewDraft: (responseId, reviewData) => request(`/ai/responses/${responseId}/review`, { method: 'POST', body: JSON.stringify(reviewData) }),
  summarizeThread: (ticketId) => request(`/ai/tickets/${ticketId}/summarize`),
  getLlmCalls: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/ai/debug/llm-calls?${qs}`);
  },
  getPrompts: () => request('/ai/prompts'),

  // Analytics
  getOverviewMetrics: () => request('/analytics/overview'),
  getBreakdown: () => request('/analytics/breakdown'),
  getEmployeePerformance: () => request('/analytics/employee-performance'),
  getWeeklyTrends: () => request('/analytics/trends'),
  getPromptPerformance: () => request('/analytics/prompt-performance'),
};
