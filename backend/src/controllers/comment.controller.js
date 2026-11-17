const db = require('../config/db');

/**
 * GET /api/tickets/:ticketId/comments
 * Fetch thread messages. Internal notes hidden if not employee.
 */
const getTicketComments = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const isEmployee = Boolean(req.user);

    let queryText = `
      SELECT id, ticket_id, author_id, author_type, author_name, body, is_internal_note, created_at
      FROM comments
      WHERE ticket_id = $1
    `;
    const params = [ticketId];

    if (!isEmployee) {
      queryText += ' AND is_internal_note = false';
    }

    queryText += ' ORDER BY created_at ASC';

    const result = await db.query(queryText, params);
    res.json({
      success: true,
      comments: result.rows,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/tickets/:ticketId/comments
 * Add comment / reply / internal note to ticket thread
 */
const addComment = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const { body, is_internal_note, author_name, author_email } = req.body;

    if (!body || body.trim() === '') {
      return res.status(400).json({ success: false, error: 'Comment body cannot be empty.' });
    }

    // Verify ticket exists
    const ticketRes = await db.query('SELECT id, status, customer_id FROM tickets WHERE id = $1', [ticketId]);
    if (ticketRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Ticket not found.' });
    }

    let authorId = null;
    let authorType = 'customer';
    let finalAuthorName = author_name || 'Customer';
    let isInternal = Boolean(is_internal_note);

    if (req.user) {
      // Authenticated Agent / Admin
      authorId = req.user.id;
      authorType = 'employee';
      finalAuthorName = req.user.name;
    } else {
      // Customer submitting a reply
      isInternal = false; // Customers can never create internal notes
      authorId = ticketRes.rows[0].customer_id;
    }

    const insertRes = await db.query(
      `INSERT INTO comments (ticket_id, author_id, author_type, author_name, body, is_internal_note)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [ticketId, authorId, authorType, finalAuthorName, body.trim(), isInternal]
    );

    res.status(201).json({
      success: true,
      comment: insertRes.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getTicketComments,
  addComment,
};
