const db = require('../config/db');

/**
 * GET /api/tickets/:ticketId/history
 * Fetch audit trail for ticket
 */
const getTicketHistory = async (req, res, next) => {
  try {
    const { ticketId } = req.params;

    const result = await db.query(
      `SELECT 
         th.id,
         th.ticket_id,
         th.changed_by,
         e.name as changed_by_name,
         th.field_changed,
         th.old_value,
         th.new_value,
         th.reason,
         th.created_at
       FROM ticket_history th
       LEFT JOIN employees e ON e.id = th.changed_by
       WHERE th.ticket_id = $1
       ORDER BY th.created_at DESC`,
      [ticketId]
    );

    res.json({
      success: true,
      history: result.rows,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getTicketHistory,
};
