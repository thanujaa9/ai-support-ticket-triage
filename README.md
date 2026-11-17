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
- [ ] **Stage 2: Backend Architecture & Core REST APIs**
- [ ] **Stage 3: Authentication & Role-Based Access Control (Admin / Agent)**
- [ ] **Stage 4: Frontend Development (Dashboard, Ticket Views, Customer Portal)**
- [ ] **Stage 5: AI Integration & Human-in-the-Loop Review Engine**
- [ ] **Stage 6: SQL Analytics, SLA Overdue Monitor & LLM Run Debugger**

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
