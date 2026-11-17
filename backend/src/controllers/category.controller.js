const db = require('../config/db');

const listCategories = async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT id, name, description, is_active, created_at FROM categories ORDER BY name ASC'
    );
    res.json({
      success: true,
      categories: result.rows,
    });
  } catch (err) {
    next(err);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Category name is required.' });
    }

    const result = await db.query(
      `INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING *`,
      [name.trim(), description || null]
    );

    res.status(201).json({
      success: true,
      category: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listCategories,
  createCategory,
};
