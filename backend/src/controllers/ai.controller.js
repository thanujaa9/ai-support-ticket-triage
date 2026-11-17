const db = require('../config/db');
const AiService = require('../services/ai.service');

/**
 * POST /api/ai/tickets/:ticketId/triage
 * Trigger AI triage (classification, sentiment, priority, and draft reply)
 */
const triageTicket = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const result = await AiService.triageTicket(parseInt(ticketId, 10));

    res.json({
      success: true,
      message: 'AI triage analysis completed successfully.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/ai/responses/:id/review
 * Human-in-the-Loop: Approve, Edit, or Reject AI Draft
 * Body: { status: 'approved' | 'edited' | 'rejected', final_reply?: string, feedback_reason?: string, send_as_comment?: boolean }
 */
const reviewAiResponse = async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { status, final_reply, feedback_reason, send_as_comment = true } = req.body;

    if (!['approved', 'edited', 'rejected'].includes(status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Status must be one of: "approved", "edited", or "rejected".',
      });
    }

    const aiRes = await client.query('SELECT * FROM ai_responses WHERE id = $1', [id]);
    if (aiRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'AI response not found.' });
    }

    const draft = aiRes.rows[0];
    const finalReplyText = status === 'edited' ? final_reply : draft.draft_reply;

    // 1. Update ai_responses record
    const updateRes = await client.query(
      `UPDATE ai_responses 
       SET status = $1,
           reviewed_by = $2,
           reviewed_at = CURRENT_TIMESTAMP,
           final_reply_sent = $3,
           feedback_reason = $4
       WHERE id = $5
       RETURNING *`,
      [
        status,
        req.user.id,
        status === 'rejected' ? null : finalReplyText,
        feedback_reason || null,
        id,
      ]
    );

    // 2. If approved or edited and send_as_comment is true, post to comments thread
    if ((status === 'approved' || status === 'edited') && send_as_comment && finalReplyText) {
      await client.query(
        `INSERT INTO comments (ticket_id, author_id, author_type, author_name, body, is_internal_note)
         VALUES ($1, $2, 'employee', $3, $4, false)`,
        [draft.ticket_id, req.user.id, req.user.name, finalReplyText]
      );

      // If ticket was 'open', progress it to 'in_progress' or 'waiting_on_customer'
      await client.query(
        `UPDATE tickets 
         SET status = 'waiting_on_customer'
         WHERE id = $1 AND status = 'open'`,
        [draft.ticket_id]
      );
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `AI draft marked as ${status}.`,
      ai_response: updateRes.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

/**
 * GET /api/ai/tickets/:ticketId/summarize
 * Generates structured 3-point thread summary
 */
const summarizeThread = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const summary = await AiService.summarizeThread(parseInt(ticketId, 10));

    res.json({
      success: true,
      summary,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/ai/prompts
 * List prompt versions for Prompt Version Management
 */
const listPromptVersions = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT * FROM prompt_versions ORDER BY created_at DESC`
    );
    res.json({
      success: true,
      prompts: result.rows,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/ai/debug/llm-calls
 * Telemetry endpoint for the LLM Run Debugger
 */
const getLlmCalls = async (req, res, next) => {
  try {
    const { ticketId, status, limit = 50 } = req.query;
    let sql = `SELECT lc.*, t.ticket_number, t.subject as ticket_subject 
               FROM llm_calls lc
               LEFT JOIN tickets t ON t.id = lc.ticket_id`;
    const params = [];
    const where = [];

    if (ticketId) {
      params.push(parseInt(ticketId, 10));
      where.push(`lc.ticket_id = $${params.length}`);
    }

    if (status && status !== 'all') {
      params.push(status);
      where.push(`lc.status = $${params.length}`);
    }

    if (where.length > 0) {
      sql += ` WHERE ${where.join(' AND ')}`;
    }

    params.push(Math.min(100, parseInt(limit, 10)));
    sql += ` ORDER BY lc.created_at DESC LIMIT $${params.length}`;

    const result = await db.query(sql, params);

    res.json({
      success: true,
      total: result.rows.length,
      calls: result.rows,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  triageTicket,
  reviewAiResponse,
  summarizeThread,
  listPromptVersions,
  getLlmCalls,
};
