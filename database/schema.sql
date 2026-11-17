-- ============================================================================
-- AI SUPPORT TICKET TRIAGE - DATABASE SCHEMA
-- PostgreSQL 14+ compatible
-- ============================================================================

-- Enable essential PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Trigram extension for text similarity & fuzzy search

-- Drop tables if resetting (in reverse dependency order)
DROP TABLE IF EXISTS llm_calls CASCADE;
DROP TABLE IF EXISTS ai_responses CASCADE;
DROP TABLE IF EXISTS prompt_versions CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS ticket_history CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS sla_policies CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS customers CASCADE;

-- Drop custom trigger functions if resetting
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS set_ticket_sla_and_number() CASCADE;
DROP FUNCTION IF EXISTS log_ticket_history() CASCADE;

-- ============================================================================
-- 1. UTILITY FUNCTIONS & PROCEDURES
-- ============================================================================

-- Generic trigger to automatically maintain updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Sequence for human-readable Ticket Numbers (e.g., TIC-1001, TIC-1002)
CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START 1001;

-- ============================================================================
-- 2. CORE MASTER & USER TABLES
-- ============================================================================

-- Customers Table
-- Stores end-users who submit tickets via customer portal
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    company VARCHAR(255),
    phone VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Employees Table
-- Stores internal support agents and admins with bcrypt-hashed passwords and roles
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'agent')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Categories Table
-- Ticket classification categories (e.g. Billing, Technical, Bug, Security)
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- SLA Policies Table
-- Priority-based response and resolution targets in hours
CREATE TABLE sla_policies (
    id SERIAL PRIMARY KEY,
    priority VARCHAR(50) NOT NULL UNIQUE CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    response_time_hours NUMERIC(6,2) NOT NULL CHECK (response_time_hours > 0),
    resolution_time_hours NUMERIC(6,2) NOT NULL CHECK (resolution_time_hours > 0),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================================
-- 3. TICKET MANAGEMENT TABLES
-- ============================================================================

-- Tickets Table
-- Main operational record tracking lifecycle, customer, assignee, SLA and duplicates
CREATE TABLE tickets (
    id SERIAL PRIMARY KEY,
    ticket_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    category_id INT REFERENCES categories(id) ON DELETE SET NULL,
    assigned_to INT REFERENCES employees(id) ON DELETE SET NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed')),
    priority VARCHAR(50) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    sentiment VARCHAR(50) CHECK (sentiment IN ('positive', 'neutral', 'negative', 'urgent')),
    sla_due_at TIMESTAMPTZ,
    is_overdue BOOLEAN NOT NULL DEFAULT false,
    is_duplicate BOOLEAN NOT NULL DEFAULT false,
    duplicate_of_ticket_id INT REFERENCES tickets(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Ticket History Table
-- Audit trail tracking changes to status, assignment, priority, and categories
CREATE TABLE ticket_history (
    id SERIAL PRIMARY KEY,
    ticket_id INT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    changed_by INT REFERENCES employees(id) ON DELETE SET NULL,
    field_changed VARCHAR(100) NOT NULL, -- e.g. 'status', 'assigned_to', 'priority', 'category_id'
    old_value TEXT,
    new_value TEXT,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Comments Table
-- Thread of messages between customers, support agents, and automated system/AI notes
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    ticket_id INT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    author_id INT, -- Refers to customer_id or employee_id depending on author_type
    author_type VARCHAR(50) NOT NULL CHECK (author_type IN ('customer', 'employee', 'system', 'ai')),
    author_name VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    is_internal_note BOOLEAN NOT NULL DEFAULT false, -- If true, hidden from customer portal
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================================
-- 4. AI & LLM ENGINE TABLES
-- ============================================================================

-- Prompt Versions Table
-- Supports prompt engineering lifecycle, versioning, A/B testing and rollbacks
CREATE TABLE prompt_versions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    version VARCHAR(20) NOT NULL,
    purpose VARCHAR(50) NOT NULL CHECK (purpose IN ('classification', 'draft_reply', 'summarization', 'duplicate_detection')),
    system_prompt TEXT NOT NULL,
    user_prompt_template TEXT NOT NULL,
    model VARCHAR(100) NOT NULL DEFAULT 'gpt-4o-mini',
    temperature NUMERIC(3,2) NOT NULL DEFAULT 0.20,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_prompt_name_version UNIQUE (name, version)
);

-- AI Responses Table
-- Stores generated AI drafts, proposed metadata, confidence scores and human review decisions
CREATE TABLE ai_responses (
    id SERIAL PRIMARY KEY,
    ticket_id INT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    prompt_version_id INT REFERENCES prompt_versions(id) ON DELETE SET NULL,
    proposed_category_id INT REFERENCES categories(id) ON DELETE SET NULL,
    proposed_priority VARCHAR(50) CHECK (proposed_priority IN ('low', 'medium', 'high', 'urgent')),
    proposed_sentiment VARCHAR(50) CHECK (proposed_sentiment IN ('positive', 'neutral', 'negative', 'urgent')),
    draft_reply TEXT,
    confidence_score NUMERIC(4,3) CHECK (confidence_score >= 0.000 AND confidence_score <= 1.000),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'edited', 'rejected')),
    reviewed_by INT REFERENCES employees(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    final_reply_sent TEXT,
    feedback_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- LLM Calls Table
-- Low-level observability and debugging table: stores exact payloads, latency, token usage, and errors
CREATE TABLE llm_calls (
    id SERIAL PRIMARY KEY,
    ticket_id INT REFERENCES tickets(id) ON DELETE CASCADE,
    prompt_version_id INT REFERENCES prompt_versions(id) ON DELETE SET NULL,
    operation_type VARCHAR(100) NOT NULL, -- e.g. 'triage_classification', 'draft_reply', 'thread_summary', 'duplicate_check'
    model VARCHAR(100) NOT NULL,
    request_payload JSONB NOT NULL,
    response_payload JSONB,
    prompt_tokens INT DEFAULT 0,
    completion_tokens INT DEFAULT 0,
    total_tokens INT DEFAULT 0,
    latency_ms INT DEFAULT 0,
    cost_usd NUMERIC(8,6) DEFAULT 0.000000,
    status VARCHAR(50) NOT NULL CHECK (status IN ('success', 'failed', 'fallback')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================================
-- 5. PERFORMANCE INDEXES (OPTIMIZED FOR QUERY FILTERS & FULL-TEXT SEARCH)
-- ============================================================================

-- Foreign Key Indexes (Avoid table scans during JOINs and CASCADE operations)
CREATE INDEX idx_tickets_customer_id ON tickets(customer_id);
CREATE INDEX idx_tickets_category_id ON tickets(category_id);
CREATE INDEX idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX idx_ticket_history_ticket_id ON ticket_history(ticket_id);
CREATE INDEX idx_comments_ticket_id ON comments(ticket_id);
CREATE INDEX idx_ai_responses_ticket_id ON ai_responses(ticket_id);
CREATE INDEX idx_llm_calls_ticket_id ON llm_calls(ticket_id);

-- Operational Query Indexes
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_priority ON tickets(priority);
CREATE INDEX idx_tickets_created_at ON tickets(created_at DESC);
CREATE INDEX idx_tickets_status_priority ON tickets(status, priority);

-- SLA Monitoring Partial Index (Only index active tickets that have an SLA target)
CREATE INDEX idx_tickets_sla_active ON tickets(sla_due_at, is_overdue) 
WHERE status NOT IN ('resolved', 'closed');

-- Full-Text Search Index (PostgreSQL GIN index for keyword search across subject & description)
CREATE INDEX idx_tickets_fts ON tickets USING gin(to_tsvector('english', subject || ' ' || description));

-- Trigram Similarity Index on ticket subject (Optimizes fast duplicate ticket detection)
CREATE INDEX idx_tickets_subject_trgm ON tickets USING gin(subject gin_trgm_ops);

-- Chronological indexes for sub-tables
CREATE INDEX idx_comments_created_at ON comments(ticket_id, created_at ASC);
CREATE INDEX idx_ticket_history_created_at ON ticket_history(ticket_id, created_at DESC);
CREATE INDEX idx_llm_calls_created_at ON llm_calls(created_at DESC);

-- ============================================================================
-- 6. AUTOMATED BUSINESS LOGIC TRIGGERS
-- ============================================================================

-- Trigger for auto-updating timestamps
CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON customers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_employees_updated_at BEFORE UPDATE ON employees
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_tickets_updated_at BEFORE UPDATE ON tickets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_prompt_versions_updated_at BEFORE UPDATE ON prompt_versions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_ai_responses_updated_at BEFORE UPDATE ON ai_responses
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function & Trigger: Calculate SLA Due Date and Format Ticket Number on Insert
CREATE OR REPLACE FUNCTION set_ticket_sla_and_number()
RETURNS TRIGGER AS $$
DECLARE
    policy_hours NUMERIC;
BEGIN
    -- 1. Generate ticket_number if null (e.g. TIC-1001)
    IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
        NEW.ticket_number := 'TIC-' || nextval('ticket_number_seq')::text;
    END IF;

    -- 2. Lookup SLA policy resolution hours for this priority
    SELECT resolution_time_hours INTO policy_hours
    FROM sla_policies
    WHERE priority = NEW.priority;

    -- 3. Set SLA due date if not explicitly specified
    IF NEW.sla_due_at IS NULL AND policy_hours IS NOT NULL THEN
        NEW.sla_due_at := NEW.created_at + (policy_hours || ' hours')::interval;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tickets_sla_and_number BEFORE INSERT ON tickets
FOR EACH ROW EXECUTE FUNCTION set_ticket_sla_and_number();

-- Function & Trigger: Automatically Audit Key Ticket Field Changes into ticket_history
CREATE OR REPLACE FUNCTION log_ticket_history()
RETURNS TRIGGER AS $$
BEGIN
    -- Track status change
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO ticket_history (ticket_id, changed_by, field_changed, old_value, new_value, reason)
        VALUES (NEW.id, NEW.assigned_to, 'status', OLD.status, NEW.status, 'Status updated via ticket lifecycle');
        
        -- If status became resolved, record resolved_at timestamp
        IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
            NEW.resolved_at := CURRENT_TIMESTAMP;
        END IF;

        -- If status became closed, record closed_at timestamp
        IF NEW.status = 'closed' AND OLD.status != 'closed' THEN
            NEW.closed_at := CURRENT_TIMESTAMP;
        END IF;
    END IF;

    -- Track assignment change
    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
        INSERT INTO ticket_history (ticket_id, changed_by, field_changed, old_value, new_value, reason)
        VALUES (NEW.id, NEW.assigned_to, 'assigned_to', OLD.assigned_to::text, NEW.assigned_to::text, 'Ticket reassigned');
    END IF;

    -- Track priority change (and recalculate SLA if changed)
    IF OLD.priority IS DISTINCT FROM NEW.priority THEN
        INSERT INTO ticket_history (ticket_id, changed_by, field_changed, old_value, new_value, reason)
        VALUES (NEW.id, NEW.assigned_to, 'priority', OLD.priority, NEW.priority, 'Priority updated');
        
        -- Recalculate SLA due date based on new priority
        SELECT NEW.created_at + (resolution_time_hours || ' hours')::interval INTO NEW.sla_due_at
        FROM sla_policies
        WHERE priority = NEW.priority;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tickets_history_audit BEFORE UPDATE ON tickets
FOR EACH ROW EXECUTE FUNCTION log_ticket_history();
