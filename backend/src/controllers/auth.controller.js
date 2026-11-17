const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const env = require('../config/env');

/**
 * Generate JWT token for employee
 */
const generateToken = (employee) => {
  return jwt.sign(
    {
      id: employee.id,
      email: employee.email,
      role: employee.role,
      name: employee.name,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
};

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide both email and password.',
      });
    }

    const result = await db.query(
      'SELECT id, name, email, password_hash, role, is_active FROM employees WHERE email = $1',
      [email.trim().toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.',
      });
    }

    const employee = result.rows[0];

    if (!employee.is_active) {
      return res.status(403).json({
        success: false,
        error: 'This account has been deactivated. Please contact an administrator.',
      });
    }

    const isMatch = await bcrypt.compare(password, employee.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.',
      });
    }

    const token = generateToken(employee);

    res.json({
      success: true,
      token,
      user: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me
 * Requires: authenticate middleware
 */
const getMe = async (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
};

/**
 * POST /api/auth/register
 * Admin only: Create new agent or admin account
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, password, and role (admin or agent) are required.',
      });
    }

    if (!['admin', 'agent'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Role must be either "admin" or "agent".',
      });
    }

    const existing = await db.query('SELECT id FROM employees WHERE email = $1', [email.trim().toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'An employee with this email already exists.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const insertResult = await db.query(
      `INSERT INTO employees (name, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, name, email, role, is_active, created_at`,
      [name.trim(), email.trim().toLowerCase(), password_hash, role]
    );

    res.status(201).json({
      success: true,
      message: 'Employee account created successfully.',
      user: insertResult.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/employees
 * List all active employees for ticket assignment
 */
const listEmployees = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, name, email, role, is_active, created_at 
       FROM employees 
       ORDER BY name ASC`
    );
    res.json({
      success: true,
      employees: result.rows,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  login,
  getMe,
  register,
  listEmployees,
};
