# AI Support Ticket Triage — Resume & Technical Portfolio Guide

> **GitHub Repository**: https://github.com/thanujaa9/ai-support-ticket-triage  
> **Tech Stack**: React.js, Node.js, Express.js, PostgreSQL, Google Gemini API / OpenAI API, JWT, bcryptjs, Chart.js, Vite  

---

## 1. Resume Bullet Points (Ready to Copy-Paste)

### Option A: Full-Stack / Backend Focus
```markdown
AI-Powered Support Ticket Triage & Observability Platform | React.js, Node.js, Express, PostgreSQL, Gemini API
• Architected a full-stack support triage engine handling ticket classification, sentiment scoring, and SLA monitoring across 10 relational PostgreSQL tables with ACID transactions.
• Engineered duplicate ticket detection using PostgreSQL pg_trgm (trigram) GIN indexing, executing sub-5ms semantic candidate similarity searches directly within the database engine.
• Designed a resilient LLM integration pipeline featuring provider adapters (Google Gemini / OpenAI) with deterministic heuristic NLP fallbacks, guaranteeing 100% operational uptime during API rate limits (429).
• Implemented human-in-the-loop draft review workflows, thread summarization, and an interactive LLM Run Debugger logging token usage, latency (ms), and raw request/response payloads in JSONB.
• Built dynamic operational dashboards and Chart.js analytics using PostgreSQL date truncations and window aggregations to track SLA breach alerts, agent performance, and prompt acceptance rates.
```

### Option B: Applied AI / AI Systems Engineering Focus
```markdown
Enterprise AI Support Ticket Triage System | React, Express, PostgreSQL, LLM Integration, JWT, Chart.js
• Designed and deployed a production-grade AI support desk featuring automated category, priority, and sentiment classification with confidence scoring and versioned prompt governance.
• Built a fault-tolerant AI orchestration service supporting Google Gemini 1.5 Flash and OpenAI gpt-4o-mini with automated rule-based NLP fallbacks to eliminate downtime and reduce token expenditure.
• Implemented a low-level LLM Observability & Debugger suite capturing raw JSON payloads, prompt/completion tokens, and latency benchmarks into an audit-logged llm_calls PostgreSQL telemetry table.
• Developed role-based authentication (RBAC) via JWT and bcrypt (cost factor 10), isolating admin operations and internal support notes (is_internal_note) from external customer views.
• Optimized database performance using partial indexes on active SLA deadlines and full-text search (GIN) across ticket subject and description columns.
```

---

## 2. Key Architecture Problems & Solutions for Technical Interviews

| Problem | Why It's Hard | How You Solved It |
|---|---|---|
| **Duplicate Ticket Detection** | Pulling thousands of open tickets into application memory to compare text strings wastes CPU and network bandwidth ($O(N)$). | Leveraged PostgreSQL's `pg_trgm` extension with a GIN index on `subject gin_trgm_ops`. Candidates are compared directly in the SQL engine in <5ms. |
| **LLM Rate Limits & Zero-Budget Resiliency** | External AI APIs can hit 429 rate limits, encounter network failures, or exhaust token quotas. | Built an adapter pattern with Google Gemini free-tier (15 RPM / 1,500 daily calls) and a deterministic heuristic NLP fallback that runs in-memory if APIs fail, logging the fallback in `llm_calls`. |
| **SLA Overdue Tracking at Scale** | Over 90% of tickets in customer service are closed or resolved; indexing them all wastes RAM and I/O. | Created a PostgreSQL **partial index** `WHERE status NOT IN ('resolved', 'closed')`, keeping the index small, cached in RAM, and sub-millisecond fast. |
| **Audit Trails & Concurrency** | Tracking state changes (status, priority, assignee) without race conditions or lost history. | Created PostgreSQL triggers (`log_ticket_history`) and transactional queries (`BEGIN...COMMIT`), guaranteeing an immutable audit trail. |
| **Telemetry vs Domain Separation** | Mixing LLM debug metrics (tokens, latency, prompt templates) into domain models pollutes database design. | Separated business state (`ai_responses`) from low-level system telemetry (`llm_calls` with JSONB payloads). |

---

## 3. STAR-Method Interview Stories

### Story 1: "Tell me about a complex database problem you solved."
- **Situation**: In our ticket triage system, customers frequently submit duplicate tickets when encountering outages or billing errors.
- **Task**: I needed a fast, scalable way to detect duplicate tickets in real time upon submission without slowing down customer requests or overloading backend CPU.
- **Action**: Instead of performing brute-force fuzzy string comparison in Node.js, I leveraged PostgreSQL's `pg_trgm` extension. I created a GIN index on ticket subjects and executed an in-database similarity query (`similarity(subject, $1) > 0.45`) limited to active tickets.
- **Result**: Candidate duplicates were detected in under 5 milliseconds directly during the creation transaction, allowing the frontend to instantly flag warnings to both the customer and agent.

### Story 2: "How did you ensure reliability when integrating external AI APIs?"
- **Situation**: External LLM APIs can face rate limits, network timeouts, or token budget exhaustion, which would break the support intake pipeline.
- **Task**: The application required a resilient design where ticket creation and triage succeed even when external APIs fail.
- **Action**: I implemented a provider-agnostic service using an adapter pattern. I configured Google Gemini API for free-tier high throughput, accompanied by an automatic heuristic NLP fallback engine that catches API errors, classifies tickets using keyword heuristics, and logs the incident in `llm_calls` with status `fallback`.
- **Result**: The system achieved 100% operational uptime without ever crashing or dropping customer tickets, while the LLM Debugger dashboard gave engineers immediate visibility into API latencies and errors.
