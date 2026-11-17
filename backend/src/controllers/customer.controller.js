const db = require('../config/db');

/**
 * GET /api/customers
 * List all customers with open and total ticket counts
 */
const listCustomers = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT 
        c.*,
        COUNT(t.id) as total_tickets,
        COUNT(CASE WHEN t.status NOT IN ('resolved', 'closed') THEN 1 END) as open_tickets
      FROM customers c
      LEFT JOIN tickets t ON t.customer_id = c.id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);

    res.json({
      success: true,
      customers: result.rows,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/customers/:id
 * Retrieve customer details and all their submitted tickets
 */
const getCustomerById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const customerRes = await db.query('SELECT * FROM customers WHERE id = $1', [id]);
    if (customerRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Customer not found.' });
    }

    const ticketsRes = await db.query(
      `SELECT t.*, cat.name as category_name
       FROM tickets t
       LEFT JOIN categories cat ON cat.id = t.category_id
       WHERE t.customer_id = $1
       ORDER BY t.created_at DESC`,
      [id]
    );

    res.json({
      success: true,
      customer: customerRes.rows[0],
      tickets: ticketsRes.rows,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listCustomers,
  getCustomerById,
};
