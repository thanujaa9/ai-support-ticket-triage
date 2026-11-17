const db = require('../config/db');

/**
 * SQL Analytics Controller
 * Implements high-performance analytical queries using GROUP BY, window functions, and date truncations
 */

/**
 * GET /api/analytics/overview
 * KPI metrics summary: total, open, overdue, avg resolution hours, AI approval rate
 */
const getOverviewMetrics = async (req, res, next) => {
  try {
    const kpiSql = `
      SELECT 
        COUNT(*) as total_tickets,
        COUNT(CASE WHEN status NOT IN ('resolved', 'closed') THEN 1 END) as open_tickets,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_tickets,
        COUNT(CASE WHEN is_overdue = true AND status NOT IN ('resolved', 'closed') THEN 1 END) as overdue_tickets,
        ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600)::numeric, 1) as avg_resolution_hours,
        COUNT(CASE WHEN is_duplicate = true THEN 1 END) as duplicate_tickets
      FROM tickets;
    `;

    const aiKpiSql = `
      SELECT 
        COUNT(*) as total_drafts,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_drafts,
        COUNT(CASE WHEN status = 'edited' THEN 1 END) as edited_drafts,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_drafts,
        ROUND((COUNT(CASE WHEN status IN ('approved', 'edited') THEN 1 END)::numeric / NULLIF(COUNT(*), 0) * 100), 1) as acceptance_rate_pct
      FROM ai_responses;
    `;

    const [kpiRes, aiKpiRes] = await Promise.all([
      db.query(kpiSql),
      db.query(aiKpiSql),
    ]);

    res.json({
      success: true,
      kpis: {
        ...kpiRes.rows[0],
        ...aiKpiRes.rows[0],
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/analytics/breakdown
 * Category, priority, and sentiment distributions for Chart.js
 */
const getDistributionBreakdown = async (req, res, next) => {
  try {
    const categorySql = `
      SELECT 
        COALESCE(c.name, 'Uncategorized') as category_name,
        COUNT(t.id) as count
      FROM tickets t
      LEFT JOIN categories c ON c.id = t.category_id
      GROUP BY c.name
      ORDER BY count DESC;
    `;

    const prioritySql = `
      SELECT 
        priority,
        COUNT(id) as count
      FROM tickets
      GROUP BY priority
      ORDER BY 
        CASE priority 
          WHEN 'urgent' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          WHEN 'low' THEN 4 
        END;
    `;

    const statusSql = `
      SELECT 
        status,
        COUNT(id) as count
      FROM tickets
      GROUP BY status;
    `;

    const [catRes, prioRes, statusRes] = await Promise.all([
      db.query(categorySql),
      db.query(prioritySql),
      db.query(statusSql),
    ]);

    res.json({
      success: true,
      categories: catRes.rows,
      priorities: prioRes.rows,
      statuses: statusRes.rows,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/analytics/employee-performance
 * Agent leaderboard: tickets assigned, resolved, and avg resolution time
 */
const getEmployeePerformance = async (req, res, next) => {
  try {
    const sql = `
      SELECT 
        e.id,
        e.name,
        e.email,
        COUNT(t.id) as assigned_tickets,
        COUNT(CASE WHEN t.status = 'resolved' THEN 1 END) as resolved_tickets,
        ROUND(AVG(CASE WHEN t.status = 'resolved' THEN EXTRACT(EPOCH FROM (t.resolved_at - t.created_at))/3600 END)::numeric, 1) as avg_resolution_hours,
        COUNT(CASE WHEN t.is_overdue = true AND t.status NOT IN ('resolved', 'closed') THEN 1 END) as overdue_tickets
      FROM employees e
      LEFT JOIN tickets t ON t.assigned_to = e.id
      WHERE e.role = 'agent' AND e.is_active = true
      GROUP BY e.id, e.name, e.email
      ORDER BY resolved_tickets DESC, assigned_tickets DESC;
    `;

    const result = await db.query(sql);

    res.json({
      success: true,
      agents: result.rows,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/analytics/trends
 * Weekly volume trends for tickets created vs resolved
 */
const getWeeklyTrends = async (req, res, next) => {
  try {
    const sql = `
      SELECT 
        TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD') as date_label,
        COUNT(*) as tickets_created,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as tickets_resolved
      FROM tickets
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date_label ASC;
    `;

    const result = await db.query(sql);

    res.json({
      success: true,
      trends: result.rows,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/analytics/prompt-performance
 * Comparison of prompt version approval rates and latencies
 */
const getPromptPerformance = async (req, res, next) => {
  try {
    const sql = `
      SELECT 
        pv.id,
        pv.name,
        pv.version,
        pv.model,
        pv.purpose,
        COUNT(ar.id) as total_drafts,
        COUNT(CASE WHEN ar.status = 'approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN ar.status = 'edited' THEN 1 END) as edited_count,
        COUNT(CASE WHEN ar.status = 'rejected' THEN 1 END) as rejected_count,
        ROUND((COUNT(CASE WHEN ar.status = 'approved' THEN 1 END)::numeric / NULLIF(COUNT(ar.id), 0) * 100), 1) as direct_approval_rate_pct,
        ROUND((COUNT(CASE WHEN ar.status IN ('approved', 'edited') THEN 1 END)::numeric / NULLIF(COUNT(ar.id), 0) * 100), 1) as acceptance_rate_pct
      FROM prompt_versions pv
      LEFT JOIN ai_responses ar ON ar.prompt_version_id = pv.id
      GROUP BY pv.id, pv.name, pv.version, pv.model, pv.purpose
      ORDER BY pv.created_at DESC;
    `;

    const result = await db.query(sql);

    res.json({
      success: true,
      prompts: result.rows,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getOverviewMetrics,
  getDistributionBreakdown,
  getEmployeePerformance,
  getWeeklyTrends,
  getPromptPerformance,
};
