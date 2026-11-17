# AI Support Ticket Triage System

An end-to-end, enterprise-grade AI Support Ticket Triage platform built with **React**, **Node.js/Express**, **PostgreSQL**, and **LLM Integration**.

The system automates ticket classification, sentiment analysis, priority assignment, draft reply generation with human-in-the-loop review, SLA timer tracking, duplicate detection, and rich analytics.

---

## 🛠️ Architecture & Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React.js, Modern CSS, Chart.js |
| **Backend** | Node.js, Express.js (RESTful APIs) |
| **Database** | PostgreSQL 14+ (Triggers, GIN Full-Text & Trigram Indexes, Audit Logs) |
| **Authentication** | JWT (JSON Web Tokens), bcryptjs |
| **AI Integration** | OpenAI API / Gemini API (Versioned Prompts, JSON output, LLM Debugger) |
| **Testing & Deployment** | Postman, Git / GitHub, Vercel (Client) + Render (Server) |

---

## 🚀 Project Roadmap

- [x] **Stage 1: Database Design & Relational Architecture**
  - [x] 10 Production Tables (`customers`, `employees`, `categories`, `sla_policies`, `tickets`, `ticket_history`, `comments`, `prompt_versions`, `ai_responses`, `llm_calls`)
  - [x] GIN indexes for Full-Text Search and Trigram similarity (Duplicate detection)
  - [x] Partial index for active SLA monitoring
  - [x] Automated PostgreSQL triggers for `updated_at`, ticket number formatting (`TIC-1001`), SLA due date calculations, and audit history logging
  - [x] Realistic seed dataset
- [x] **Stage 2: Backend Architecture & Core REST APIs**
  - [x] Express layered architecture (`config/`, `middleware/`, `controllers/`, `routes/`, `services/`)
  - [x] PostgreSQL connection pool (`pg.Pool`) with atomic transactions
  - [x] Full CRUD, multi-criteria filtering, full-text search, and pagination
- [x] **Stage 3: Authentication & Role-Based Access Control (Admin / Agent)**
  - [x] Secure JWT token signing & verification
  - [x] Bcrypt password hashing (Cost factor 10)
  - [x] Role-based access control (`requireRole('admin')`)
- [x] **Stage 4: Frontend Development**
  - [x] Support Operations Dashboard with live KPIs
  - [x] Ticket Queue with multi-filter bar, sorting, and priority pulsing badges
  - [x] Ticket Details with conversational comments, internal notes, and audit history
  - [x] Customer-facing Ticket Submission Portal with live duplicate warnings
  - [x] Modern, responsive SaaS design system
- [x] **Stage 5: AI Integration & Human-in-the-Loop Review Engine**
  - [x] Provider-agnostic AI adapter (Google Gemini API free tier + OpenAI API)
  - [x] Smart rule-based heuristic fallback engine (100% operational with zero keys)
  - [x] Automated classification, priority estimation, sentiment scoring, and first reply drafting
  - [x] Human-in-the-loop review workflow (Approve & Send, Inline Edit, Reject with Feedback)
  - [x] 3-bullet thread summarization
- [x] **Stage 6: SQL Analytics, SLA Overdue Monitor & LLM Run Debugger**
  - [x] KPI metrics & Chart.js visualizations (Category distribution, Priority breakdown)
  - [x] Support Agent performance leaderboard
  - [x] Prompt version governance and acceptance rate benchmarks
  - [x] Interactive LLM Run Debugger with raw payload inspection drawer and telemetry logs

---

## 💻 Running the Application

### 1. Backend Server
```bash
cd backend
npm install
node src/server.js
# Runs at http://localhost:5001
```

### 2. Frontend React Client
```bash
cd frontend
npm install
npm run dev
# Runs at http://localhost:3000 (proxies /api to :5001)
```

### 3. Demo Credentials
| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@triage.local` | `Password123!` |
| **Agent** | `sarah.agent@triage.local` | `Password123!` |
| **Agent** | `david.agent@triage.local` | `Password123!` |

---

## 🗄️ Database Setup (Stage 1)

### Prerequisites
- PostgreSQL 14 or higher installed and running.
- Ensure the database user has rights to create databases and extensions (`pg_trgm`, `uuid-ossp`).

### Quick Start
1. Create PostgreSQL Database:
   ```bash
   createdb ai_support_triage
   ```
2. Copy `.env.example` to `.env` and adjust database credentials:
   ```bash
   cp .env.example .env
   ```
3. Run the automated database setup script:
   ```bash
   node database/setup.js
   ```
   Or execute SQL scripts manually via `psql`:
   ```bash
   psql -d ai_support_triage -f database/schema.sql
   psql -d ai_support_triage -f database/seeds.sql
   ```
