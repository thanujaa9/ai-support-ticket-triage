-- ============================================================================
-- AI SUPPORT TICKET TRIAGE - SEED DATA
-- Realistic dataset for development, interview demonstrations, and analytics
-- ============================================================================

-- Clean existing data
TRUNCATE TABLE llm_calls, ai_responses, prompt_versions, comments, ticket_history, tickets, sla_policies, categories, employees, customers RESTART IDENTITY CASCADE;

-- ----------------------------------------------------------------------------
-- 1. CATEGORIES
-- ----------------------------------------------------------------------------
INSERT INTO categories (id, name, description, is_active) VALUES
(1, 'Billing & Invoices', 'Payment failures, invoices, refunds, subscription tier upgrades/downgrades', true),
(2, 'Technical Support', 'API errors, SDK integrations, webhooks, performance degradation and downtime', true),
(3, 'Account Access', 'Password resets, 2FA/MFA recovery, SSO configuration, role permissions', true),
(4, 'Bug Report', 'Unexpected software behaviors, UI glitches, broken links and data anomalies', true),
(5, 'Feature Request', 'Customer product suggestions, enhancements, new integrations and tooling', true),
(6, 'Security & Compliance', 'SOC2/GDPR inquiries, vulnerability disclosure, audit logs and penetration tests', true);

SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));

-- ----------------------------------------------------------------------------
-- 2. SLA POLICIES (Targets in hours)
-- ----------------------------------------------------------------------------
INSERT INTO sla_policies (id, priority, response_time_hours, resolution_time_hours) VALUES
(1, 'urgent', 1.0, 4.0),
(2, 'high', 4.0, 16.0),
(3, 'medium', 12.0, 48.0),
(4, 'low', 24.0, 96.0);

SELECT setval('sla_policies_id_seq', (SELECT MAX(id) FROM sla_policies));

-- ----------------------------------------------------------------------------
-- 3. EMPLOYEES (Password for all: 'Password123!' -> bcrypt hashed)
-- bcrypt hash: $2a$10$Sm6YP1wsffKiKqaGW2uhj.geUdwnp4oFdyX9Wy2b2LPFvPF9sSk5S
-- ----------------------------------------------------------------------------
INSERT INTO employees (id, name, email, password_hash, role, is_active) VALUES
(1, 'Alex Mercer (Admin)', 'admin@triage.local', '$2a$10$Sm6YP1wsffKiKqaGW2uhj.geUdwnp4oFdyX9Wy2b2LPFvPF9sSk5S', 'admin', true),
(2, 'Sarah Connor', 'sarah.agent@triage.local', '$2a$10$Sm6YP1wsffKiKqaGW2uhj.geUdwnp4oFdyX9Wy2b2LPFvPF9sSk5S', 'agent', true),
(3, 'David Chen', 'david.agent@triage.local', '$2a$10$Sm6YP1wsffKiKqaGW2uhj.geUdwnp4oFdyX9Wy2b2LPFvPF9sSk5S', 'agent', true),
(4, 'Priya Patel', 'priya.agent@triage.local', '$2a$10$Sm6YP1wsffKiKqaGW2uhj.geUdwnp4oFdyX9Wy2b2LPFvPF9sSk5S', 'agent', true);

SELECT setval('employees_id_seq', (SELECT MAX(id) FROM employees));

-- ----------------------------------------------------------------------------
-- 4. CUSTOMERS
-- ----------------------------------------------------------------------------
INSERT INTO customers (id, name, email, company, phone) VALUES
(1, 'Elena Rostova', 'elena@acmecorp.com', 'Acme Corp', '+1-555-0101'),
(2, 'Marcus Brody', 'marcus@fintechglobal.io', 'FinTech Global', '+1-555-0102'),
(3, 'Aisha Morales', 'aisha@cloudscale.net', 'CloudScale Net', '+1-555-0103'),
(4, 'Lucas Vance', 'lucas@cyberdynesys.com', 'Cyberdyne Systems', '+1-555-0104'),
(5, 'Chloe Bennett', 'chloe@nexusventures.co', 'Nexus Ventures', '+1-555-0105');

SELECT setval('customers_id_seq', (SELECT MAX(id) FROM customers));

-- ----------------------------------------------------------------------------
-- 5. PROMPT VERSIONS
-- ----------------------------------------------------------------------------
INSERT INTO prompt_versions (id, name, version, purpose, system_prompt, user_prompt_template, model, temperature, is_active) VALUES
(1, 'Triage Classifier', '1.0.0', 'classification',
 'You are an enterprise support triage AI. Analyze incoming tickets and output JSON with: proposed_category (one of "Billing & Invoices", "Technical Support", "Account Access", "Bug Report", "Feature Request", "Security & Compliance"), proposed_priority ("low", "medium", "high", "urgent"), proposed_sentiment ("positive", "neutral", "negative", "urgent"), confidence_score (0.00 to 1.00), and short reasoning.',
 'Customer Company: {{company}}\nSubject: {{subject}}\nDescription: {{description}}',
 'gpt-4o-mini', 0.10, false),

(2, 'Triage Classifier', '1.1.0', 'classification',
 'You are an advanced enterprise support triage AI. Analyze incoming customer support requests. Classify them with high precision. Return JSON strictly containing keys: proposed_category, proposed_priority, proposed_sentiment, confidence_score, and reasoning. Weigh production downtime or duplicate billing as urgent.',
 'Customer Company: {{company}}\nSubject: {{subject}}\nDescription: {{description}}',
 'gpt-4o-mini', 0.10, true),

(3, 'Draft Reply Assistant', '1.0.0', 'draft_reply',
 'You are a warm, knowledgeable technical support representative. Write a professional, empathetic, and solution-oriented reply to the customer. Acknowledge their issue, provide immediate troubleshooting steps or confirm resolution timeline, and maintain a reassuring tone.',
 'Customer Name: {{customer_name}}\nCompany: {{company}}\nCategory: {{category}}\nSubject: {{subject}}\nDescription: {{description}}',
 'gpt-4o-mini', 0.30, true),

(4, 'Thread Summarizer', '1.0.0', 'summarization',
 'You are an executive ticket summarizer. Given a conversation history of comments and status changes, summarize into 3 concise bullet points: (1) Root Problem, (2) Troubleshooting & Actions Taken, (3) Current State & Immediate Next Step.',
 'Ticket Subject: {{subject}}\nConversation History:\n{{thread_text}}',
 'gpt-4o-mini', 0.20, true),

(5, 'Duplicate Ticket Detector', '1.0.0', 'duplicate_detection',
 'You are an intelligent duplicate ticket detector. Compare the incoming ticket with candidate open tickets. Analyze technical symptoms, error messages, and customer intent. Output JSON: { is_duplicate: boolean, duplicate_of_ticket_id: number, confidence: number, explanation: string }.',
 'New Ticket Subject: {{subject}}\nNew Ticket Description: {{description}}\nCandidate Tickets:\n{{candidate_tickets}}',
 'gpt-4o-mini', 0.10, true);

SELECT setval('prompt_versions_id_seq', (SELECT MAX(id) FROM prompt_versions));

-- ----------------------------------------------------------------------------
-- 6. TICKETS
-- ----------------------------------------------------------------------------
INSERT INTO tickets (id, ticket_number, customer_id, category_id, assigned_to, subject, description, status, priority, sentiment, sla_due_at, is_overdue, is_duplicate, duplicate_of_ticket_id, resolved_at, created_at) VALUES
-- Ticket 1: Urgent Billing issue
(1, 'TIC-1001', 1, 1, 2, 
 'Double charged for annual Enterprise plan renewal', 
 'We noticed this morning that our credit card ending in 4102 was charged twice for $12,000 for invoice INV-2026-88. Our finance director has flagged this immediately. Please reverse the duplicate charge ASAP.', 
 'open', 'urgent', 'urgent', CURRENT_TIMESTAMP + INTERVAL '3 hours', false, false, NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '1 hour'),

-- Ticket 2: High Technical Support issue (Webhook failure)
(2, 'TIC-1002', 2, 2, 2, 
 'Production Webhook endpoint returning 500 Internal Server Error', 
 'Starting around 09:00 UTC today, all POST requests sent to our payment webhook listener endpoint /webhooks/v2/charge are failing with HTTP 500. This is blocking transaction sync for our downstream orders.', 
 'in_progress', 'high', 'urgent', CURRENT_TIMESTAMP + INTERVAL '10 hours', false, false, NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '6 hours'),

-- Ticket 3: Duplicate of Ticket 2
(3, 'TIC-1003', 2, 2, NULL, 
 'Webhooks failing with 500 status code since morning', 
 'Hey team, payment event webhooks are throwing 500 server errors on your server side. Any ongoing incident?', 
 'open', 'high', 'negative', CURRENT_TIMESTAMP + INTERVAL '14 hours', false, true, 2, NULL, CURRENT_TIMESTAMP - INTERVAL '2 hours'),

-- Ticket 4: High Account Access issue
(4, 'TIC-1004', 3, 3, 3, 
 'Admin user locked out of production dashboard after MFA phone replacement', 
 'Our lead DevOps engineer lost their mobile phone over the weekend. They cannot approve Duo MFA push notifications or access backup codes to log in to our organization account.', 
 'waiting_on_customer', 'high', 'negative', CURRENT_TIMESTAMP + INTERVAL '8 hours', false, false, NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '8 hours'),

-- Ticket 5: Low Feature Request
(5, 'TIC-1005', 4, 5, 4, 
 'Support for exporting ticket analytics directly to Snowflake / BigQuery', 
 'We love the built-in analytics dashboard, but our business intelligence team would love an automated daily sync or webhook export to our corporate Snowflake data warehouse.', 
 'open', 'low', 'positive', CURRENT_TIMESTAMP + INTERVAL '72 hours', false, false, NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '24 hours'),

-- Ticket 6: Medium Bug Report
(6, 'TIC-1006', 5, 4, 4, 
 'CSV export button unclickable on Safari version 17.4', 
 'When attempting to click the "Export CSV" button on the reports overview page in Safari 17.4 (macOS Sonoma), nothing happens and the console throws TypeError: window.showSaveFilePicker is not a function.', 
 'in_progress', 'medium', 'neutral', CURRENT_TIMESTAMP + INTERVAL '30 hours', false, false, NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '18 hours'),

-- Ticket 7: Overdue ticket (Simulating SLA breach)
(7, 'TIC-1007', 1, 1, 3, 
 'Unable to update corporate billing address and VAT registration number', 
 'Our legal entity changed address from Austin to Seattle. When updating VAT ID in company settings, the form resets without saving.', 
 'open', 'medium', 'negative', CURRENT_TIMESTAMP - INTERVAL '12 hours', true, false, NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '60 hours'),

-- Ticket 8: Resolved ticket
(8, 'TIC-1008', 3, 1, 2, 
 'Request for Q3 2026 invoice PDF copies for corporate audit', 
 'Could your billing department please resend PDF copies of paid invoices for July, August, and September 2026? Need them for our fiscal year audit.', 
 'resolved', 'low', 'neutral', CURRENT_TIMESTAMP - INTERVAL '50 hours', false, false, NULL, CURRENT_TIMESTAMP - INTERVAL '4 hours', CURRENT_TIMESTAMP - INTERVAL '80 hours');

SELECT setval('tickets_id_seq', (SELECT MAX(id) FROM tickets));

-- ----------------------------------------------------------------------------
-- 7. TICKET HISTORY (AUDIT LOGS)
-- ----------------------------------------------------------------------------
INSERT INTO ticket_history (ticket_id, changed_by, field_changed, old_value, new_value, reason, created_at) VALUES
(2, 2, 'assigned_to', NULL, '2', 'Assigned to Sarah Connor for technical investigation', CURRENT_TIMESTAMP - INTERVAL '5 hours 30 minutes'),
(2, 2, 'status', 'open', 'in_progress', 'Investigation started on webhook logs', CURRENT_TIMESTAMP - INTERVAL '5 hours'),
(4, 3, 'assigned_to', NULL, '3', 'Assigned to David Chen for identity verification', CURRENT_TIMESTAMP - INTERVAL '7 hours'),
(4, 3, 'status', 'open', 'waiting_on_customer', 'Requested secondary email verification from customer', CURRENT_TIMESTAMP - INTERVAL '6 hours'),
(6, 4, 'assigned_to', NULL, '4', 'Assigned to Priya Patel', CURRENT_TIMESTAMP - INTERVAL '15 hours'),
(6, 4, 'status', 'open', 'in_progress', 'Reproduced bug in Safari browser environment', CURRENT_TIMESTAMP - INTERVAL '12 hours'),
(8, 2, 'assigned_to', NULL, '2', 'Assigned to Sarah Connor', CURRENT_TIMESTAMP - INTERVAL '75 hours'),
(8, 2, 'status', 'open', 'resolved', 'Invoices emailed directly to customer', CURRENT_TIMESTAMP - INTERVAL '4 hours');

-- ----------------------------------------------------------------------------
-- 8. COMMENTS / CONVERSATION THREAD
-- ----------------------------------------------------------------------------
INSERT INTO comments (id, ticket_id, author_id, author_type, author_name, body, is_internal_note, created_at) VALUES
(1, 2, 2, 'employee', 'Sarah Connor', 'Checked our CloudWatch and Datadog logs. Looks like a serialization bug on the payload parser after the v3.4 deployment.', true, CURRENT_TIMESTAMP - INTERVAL '5 hours'),
(2, 2, 2, 'employee', 'Sarah Connor', 'Hi Marcus, thank you for reaching out. We have reproduced the issue with the webhook payload parser and our platform engineering team is preparing a hotfix. We will update you as soon as the patch is deployed.', false, CURRENT_TIMESTAMP - INTERVAL '4 hours 30 minutes'),
(3, 4, 3, 'employee', 'David Chen', 'Customer submitted ticket from non-primary email. Must verify corporate domain ownership before releasing MFA token.', true, CURRENT_TIMESTAMP - INTERVAL '6 hours 30 minutes'),
(4, 4, 3, 'employee', 'David Chen', 'Hello Aisha, to protect your organization security, please reply from your primary registered corporate email or have your account owner confirm this reset request.', false, CURRENT_TIMESTAMP - INTERVAL '6 hours'),
(5, 8, 2, 'employee', 'Sarah Connor', 'Hello Aisha, attached are the three requested invoices (INV-2026-07, 08, 09) in PDF format. Please let us know if your auditors require any additional documentation!', false, CURRENT_TIMESTAMP - INTERVAL '4 hours');

SELECT setval('comments_id_seq', (SELECT MAX(id) FROM comments));

-- ----------------------------------------------------------------------------
-- 9. AI RESPONSES (Drafts, Approvals, Rejections & Edits)
-- ----------------------------------------------------------------------------
INSERT INTO ai_responses (id, ticket_id, prompt_version_id, proposed_category_id, proposed_priority, proposed_sentiment, draft_reply, confidence_score, status, reviewed_by, reviewed_at, final_reply_sent, feedback_reason, created_at) VALUES
-- Pending review on Ticket 1
(1, 1, 2, 1, 'urgent', 'urgent',
 'Dear Elena,\n\nThank you for bringing this duplicate charge to our immediate attention. We deeply apologize for the inconvenience.\n\nI have escalated this ticket to our billing operations team to process a direct refund of $12,000 back to your card ending in 4102. You will receive an official refund receipt within 24 hours.\n\nPlease rest assured that your enterprise service remains active and unaffected.\n\nBest regards,\nEnterprise Support Team',
 0.965, 'pending', NULL, NULL, NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '50 minutes'),

-- Approved & Sent on Ticket 2
(2, 2, 2, 2, 'high', 'urgent',
 'Hi Marcus,\n\nThank you for reporting this issue. Our engineering team is currently investigating the 500 error response from /webhooks/v2/charge.\n\nWe have identified the root cause and a hotfix is currently being deployed to production. We will follow up once the fix is live.',
 0.940, 'edited', 2, CURRENT_TIMESTAMP - INTERVAL '4 hours 30 minutes',
 'Hi Marcus, thank you for reaching out. We have reproduced the issue with the webhook payload parser and our platform engineering team is preparing a hotfix. We will update you as soon as the patch is deployed.',
 'Edited draft to make tone warmer and specifically mention payload parser findings', CURRENT_TIMESTAMP - INTERVAL '5 hours 50 minutes'),

-- Approved on Ticket 8
(3, 8, 2, 1, 'low', 'neutral',
 'Hello Aisha,\n\nI would be happy to help with your invoice request. Please find the Q3 2026 invoices for July, August, and September attached.\n\nLet us know if you need anything else!\n\nBest regards,\nCustomer Support',
 0.980, 'approved', 2, CURRENT_TIMESTAMP - INTERVAL '4 hours 10 minutes',
 'Hello Aisha, attached are the three requested invoices (INV-2026-07, 08, 09) in PDF format. Please let us know if your auditors require any additional documentation!',
 'Great draft, approved with minor attachment note', CURRENT_TIMESTAMP - INTERVAL '78 hours');

SELECT setval('ai_responses_id_seq', (SELECT MAX(id) FROM ai_responses));

-- ----------------------------------------------------------------------------
-- 10. LLM CALLS (Observability & Debugger Logs)
-- ----------------------------------------------------------------------------
INSERT INTO llm_calls (id, ticket_id, prompt_version_id, operation_type, model, request_payload, response_payload, prompt_tokens, completion_tokens, total_tokens, latency_ms, cost_usd, status, error_message, created_at) VALUES
(1, 1, 2, 'triage_classification', 'gpt-4o-mini',
 '{"messages": [{"role": "system", "content": "You are an enterprise support triage AI..."}, {"role": "user", "content": "Customer: Acme Corp\nSubject: Double charged for annual Enterprise plan renewal..."}]}'::jsonb,
 '{"category": "Billing & Invoices", "priority": "urgent", "sentiment": "urgent", "confidence": 0.965, "reasoning": "Duplicate $12k enterprise transaction requires immediate financial remediation."}'::jsonb,
 342, 86, 428, 620, 0.000085, 'success', NULL, CURRENT_TIMESTAMP - INTERVAL '55 minutes'),

(2, 1, 3, 'draft_reply', 'gpt-4o-mini',
 '{"messages": [{"role": "system", "content": "You are a warm, knowledgeable technical support representative..."}, {"role": "user", "content": "Customer: Elena Rostova\nCompany: Acme Corp..."}]}'::jsonb,
 '{"reply": "Dear Elena,\n\nThank you for bringing this duplicate charge to our immediate attention..."}'::jsonb,
 410, 115, 525, 840, 0.000108, 'success', NULL, CURRENT_TIMESTAMP - INTERVAL '50 minutes'),

(3, 3, 5, 'duplicate_check', 'gpt-4o-mini',
 '{"messages": [{"role": "system", "content": "You are an intelligent duplicate ticket detector..."}, {"role": "user", "content": "New Ticket: Webhooks failing with 500 status code since morning\nCandidates: [TIC-1002]..."}]}'::jsonb,
 '{"is_duplicate": true, "duplicate_of_ticket_id": 2, "confidence": 0.95, "explanation": "Both tickets report HTTP 500 errors on payment webhook listener endpoints starting today morning."}'::jsonb,
 480, 72, 552, 710, 0.000098, 'success', NULL, CURRENT_TIMESTAMP - INTERVAL '1 hour 55 minutes'),

-- Example of a failed / fallback call (Useful for the LLM Debugger interview story!)
(4, 7, 2, 'triage_classification', 'gpt-4o-mini',
 '{"messages": [{"role": "system", "content": "You are an enterprise support triage AI..."}, {"role": "user", "content": "..."}]}'::jsonb,
 NULL, 310, 0, 310, 5200, 0.000000, 'fallback', 'OpenAI API Rate Limit Reached (429 Too Many Requests). System executed rule-based keyword fallback.', CURRENT_TIMESTAMP - INTERVAL '60 hours');

SELECT setval('llm_calls_id_seq', (SELECT MAX(id) FROM llm_calls));
