const db = require('../config/db');

const listSlaPolicies = async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT id, priority, response_time_hours, resolution_time_hours, created_at FROM sla_policies ORDER BY resolution_time_hours ASC'
    );
    res.json({
      success: true,
      policies: result.rows,
    });
  } catch (err) {
    next(err);
  }
};

const updateSlaPolicy = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { response_time_hours, resolution_time_hours } = req.body;

    if (!response_time_hours || !resolution_time_hours) {
      return res.status(400).json({
        success: false,
        error: 'Both response_time_hours and resolution_time_hours must be provided.',
      });
    }

    const result = await db.query(
      `UPDATE sla_policies 
       SET response_time_hours = $1, resolution_time_hours = $2
       WHERE id = $3
       RETURNING *`,
      [parseFloat(response_time_hours), parseFloat(resolution_time_hours), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'SLA policy not found.' });
    }

    res.json({
      success: true,
      policy: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listSlaPolicies,
  updateSlaPolicy,
};
