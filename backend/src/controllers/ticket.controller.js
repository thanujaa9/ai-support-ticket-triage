const db = require('../config/db');

/**
 * GET /api/tickets
 * Search, filter, sort, and paginate tickets
 * Query params: search, status, priority, category_id, assigned_to, is_overdue, is_duplicate, sort_by, order, page, limit
 */
const listTickets = async (req, res, next) => {
  try {
    const {
      search,
      status,
      priority,
      category_id,
      assigned_to,
      is_overdue,
      is_duplicate,
      sentiment,
      sort_by = 'created_at',
      order = 'DESC',
      page = 1,
      limit = 20,
    } = req.query;

    const offset = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const whereConditions = [];
    const params = [];

    // Search filter: Full-text search or ILIKE fallback
    if (search && search.trim() !== '') {
      params.push(`%${search.trim()}%`);
      const searchParamIdx = params.length;
      whereConditions.push(`(t.subject ILIKE $${searchParamIdx} OR t.description ILIKE $${searchParamIdx} OR t.ticket_number ILIKE $${searchParamIdx})`);
    }

    // Status filter
    if (status && status !== 'all') {
      params.push(status);
      whereConditions.push(`t.status = $${params.length}`);
    }

    // Priority filter
    if (priority && priority !== 'all') {
      params.push(priority);
      whereConditions.push(`t.priority = $${params.length}`);
    }

    // Category filter
    if (category_id && category_id !== 'all') {
      params.push(parseInt(category_id, 10));
      whereConditions.push(`t.category_id = $${params.length}`);
    }

    // Assignee filter
    if (assigned_to !== undefined && assigned_to !== 'all') {
      if (assigned_to === 'unassigned') {
        whereConditions.push(`t.assigned_to IS NULL`);
      } else {
        params.push(parseInt(assigned_to, 10));
        whereConditions.push(`t.assigned_to = $${params.length}`);
      }
    }

    // Overdue filter
    if (is_overdue !== undefined && is_overdue !== 'all') {
      params.push(is_overdue === 'true');
      whereConditions.push(`t.is_overdue = $${params.length}`);
    }

    // Duplicate filter
    if (is_duplicate !== undefined && is_duplicate !== 'all') {
      params.push(is_duplicate === 'true');
      whereConditions.push(`t.is_duplicate = $${params.length}`);
    }

    // Sentiment filter
    if (sentiment && sentiment !== 'all') {
      params.push(sentiment);
      whereConditions.push(`t.sentiment = $${params.length}`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Allowed sort columns to prevent SQL injection
    const allowedSortColumns = {
      created_at: 't.created_at',
      updated_at: 't.updated_at',
      sla_due_at: 't.sla_due_at',
      priority: `CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END`,
      status: 't.status',
      ticket_number: 't.ticket_number',
    };

    const sortColumn = allowedSortColumns[sort_by] || 't.created_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Count query
    const countSql = `SELECT COUNT(*) FROM tickets t ${whereClause}`;
    const totalCountRes = await db.query(countSql, params);
    const totalTickets = parseInt(totalCountRes.rows[0].count, 10);

    // Data query with rich JOINs
    const queryParams = [...params, safeLimit, offset];
    const dataSql = `
      SELECT 
        t.id,
        t.ticket_number,
        t.subject,
        t.description,
        t.status,
        t.priority,
        t.sentiment,
        t.sla_due_at,
        t.is_overdue,
        t.is_duplicate,
        t.duplicate_of_ticket_id,
        t.resolved_at,
        t.created_at,
        t.updated_at,
        c.id as customer_id,
        c.name as customer_name,
        c.email as customer_email,
        c.company as customer_company,
        cat.id as category_id,
        cat.name as category_name,
        e.id as assigned_to,
        e.name as assigned_to_name,
        e.email as assigned_to_email,
        (SELECT COUNT(*) FROM comments comm WHERE comm.ticket_id = t.id) as comment_count,
        (SELECT status FROM ai_responses ar WHERE ar.ticket_id = t.id ORDER BY ar.created_at DESC LIMIT 1) as ai_draft_status
      FROM tickets t
      JOIN customers c ON c.id = t.customer_id
      LEFT JOIN categories cat ON cat.id = t.category_id
      LEFT JOIN employees e ON e.id = t.assigned_to
      ${whereClause}
      ORDER BY ${sortColumn} ${sortOrder}
      LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
    `;

    const dataRes = await db.query(dataSql, queryParams);

    res.json({
      success: true,
      total: totalTickets,
      page: parseInt(page, 10),
      limit: safeLimit,
      totalPages: Math.ceil(totalTickets / safeLimit),
      tickets: dataRes.rows,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/tickets/:id
 * Retrieve comprehensive ticket view
 */
const getTicketById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const ticketSql = `
      SELECT 
        t.*,
        c.name as customer_name,
        c.email as customer_email,
        c.company as customer_company,
        c.phone as customer_phone,
        cat.name as category_name,
        e.name as assigned_to_name,
        e.email as assigned_to_email,
        dup.ticket_number as duplicate_of_ticket_number,
        dup.subject as duplicate_of_ticket_subject
      FROM tickets t
      JOIN customers c ON c.id = t.customer_id
      LEFT JOIN categories cat ON cat.id = t.category_id
      LEFT JOIN employees e ON e.id = t.assigned_to
      LEFT JOIN tickets dup ON dup.id = t.duplicate_of_ticket_id
      WHERE t.id = $1 OR t.ticket_number = $1
    `;

    const ticketRes = await db.query(ticketSql, [id]);
    if (ticketRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Ticket not found.' });
    }

    const ticket = ticketRes.rows[0];

    // Fetch latest AI response draft if available
    const aiRes = await db.query(
      `SELECT ar.*, pv.name as prompt_name, pv.version as prompt_version,
              cat.name as proposed_category_name
       FROM ai_responses ar
       LEFT JOIN prompt_versions pv ON pv.id = ar.prompt_version_id
       LEFT JOIN categories cat ON cat.id = ar.proposed_category_id
       WHERE ar.ticket_id = $1
       ORDER BY ar.created_at DESC LIMIT 1`,
      [ticket.id]
    );

    // Fetch comments
    const isEmployee = Boolean(req.user);
    const commentsRes = await db.query(
      `SELECT * FROM comments 
       WHERE ticket_id = $1 ${isEmployee ? '' : 'AND is_internal_note = false'}
       ORDER BY created_at ASC`,
      [ticket.id]
    );

    // Fetch history
    const historyRes = await db.query(
      `SELECT th.*, e.name as changed_by_name
       FROM ticket_history th
       LEFT JOIN employees e ON e.id = th.changed_by
       WHERE th.ticket_id = $1
       ORDER BY th.created_at DESC`,
      [ticket.id]
    );

    res.json({
      success: true,
      ticket: {
        ...ticket,
        latest_ai_response: aiRes.rows[0] || null,
        comments: commentsRes.rows,
        history: historyRes.rows,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/tickets
 * Customer ticket submission or Agent manual creation
 * Body: { name, email, company, phone, subject, description, priority, category_id }
 */
const createTicket = async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const {
      name,
      email,
      company,
      phone,
      subject,
      description,
      priority = 'medium',
      category_id,
    } = req.body;

    if (!email || !subject || !description) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Customer email, ticket subject, and description are required.',
      });
    }

    // 1. Find or create customer
    let customerId;
    const existingCustomer = await client.query('SELECT id FROM customers WHERE email = $1', [email.trim().toLowerCase()]);
    if (existingCustomer.rows.length > 0) {
      customerId = existingCustomer.rows[0].id;
      // Optionally update name/company if provided
      if (company || phone) {
        await client.query(
          'UPDATE customers SET company = COALESCE($1, company), phone = COALESCE($2, phone) WHERE id = $3',
          [company || null, phone || null, customerId]
        );
      }
    } else {
      const newCustomer = await client.query(
        `INSERT INTO customers (name, email, company, phone)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [name ? name.trim() : email.split('@')[0], email.trim().toLowerCase(), company || null, phone || null]
      );
      customerId = newCustomer.rows[0].id;
    }

    // 2. Duplicate Detection: Check for similar tickets using PostgreSQL Trigram similarity
    let isDuplicate = false;
    let duplicateOfTicketId = null;

    const dupCheck = await client.query(
      `SELECT id, ticket_number, subject, similarity(subject, $1) as sim
       FROM tickets
       WHERE status NOT IN ('resolved', 'closed')
         AND similarity(subject, $1) > 0.45
       ORDER BY sim DESC
       LIMIT 1`,
      [subject.trim()]
    );

    if (dupCheck.rows.length > 0) {
      isDuplicate = true;
      duplicateOfTicketId = dupCheck.rows[0].id;
    }

    // 3. Insert ticket (Trigger sets ticket_number TIC-xxxx and computes sla_due_at)
    const ticketInsertRes = await client.query(
      `INSERT INTO tickets (
         customer_id, category_id, subject, description, priority, is_duplicate, duplicate_of_ticket_id
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        customerId,
        category_id ? parseInt(category_id, 10) : null,
        subject.trim(),
        description.trim(),
        priority,
        isDuplicate,
        duplicateOfTicketId,
      ]
    );

    const createdTicket = ticketInsertRes.rows[0];

    // 4. Initial history log
    await client.query(
      `INSERT INTO ticket_history (ticket_id, changed_by, field_changed, old_value, new_value, reason)
       VALUES ($1, $2, 'ticket', NULL, 'created', 'Customer submitted ticket via portal')`,
      [createdTicket.id, req.user ? req.user.id : null]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Ticket created successfully.',
      ticket: createdTicket,
      duplicate_warning: isDuplicate
        ? {
            duplicate_of_id: duplicateOfTicketId,
            matched_subject: dupCheck.rows[0].subject,
            ticket_number: dupCheck.rows[0].ticket_number,
          }
        : null,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

/**
 * PATCH /api/tickets/:id
 * Update status, priority, category, or assignment
 */
const updateTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, priority, category_id, assigned_to, sentiment } = req.body;

    const fields = [];
    const params = [];

    if (status !== undefined) {
      params.push(status);
      fields.push(`status = $${params.length}`);
    }

    if (priority !== undefined) {
      params.push(priority);
      fields.push(`priority = $${params.length}`);
    }

    if (category_id !== undefined) {
      params.push(category_id ? parseInt(category_id, 10) : null);
      fields.push(`category_id = $${params.length}`);
    }

    if (assigned_to !== undefined) {
      params.push(assigned_to ? parseInt(assigned_to, 10) : null);
      fields.push(`assigned_to = $${params.length}`);
    }

    if (sentiment !== undefined) {
      params.push(sentiment);
      fields.push(`sentiment = $${params.length}`);
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields provided to update.' });
    }

    params.push(id);
    const updateSql = `
      UPDATE tickets
      SET ${fields.join(', ')}
      WHERE id = $${params.length}
      RETURNING *
    `;

    const result = await db.query(updateSql, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Ticket not found.' });
    }

    res.json({
      success: true,
      message: 'Ticket updated successfully.',
      ticket: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/tickets/:id/assign
 * Quick endpoint to assign ticket to an agent or self-assign
 */
const assignTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { assigned_to } = req.body; // employee id, or null to unassign

    const assigneeId = assigned_to === undefined ? req.user.id : (assigned_to ? parseInt(assigned_to, 10) : null);

    const result = await db.query(
      `UPDATE tickets
       SET assigned_to = $1
       WHERE id = $2
       RETURNING *`,
      [assigneeId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Ticket not found.' });
    }

    res.json({
      success: true,
      message: assigneeId ? 'Ticket assigned successfully.' : 'Ticket unassigned.',
      ticket: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listTickets,
  getTicketById,
  createTicket,
  updateTicket,
  assignTicket,
};
