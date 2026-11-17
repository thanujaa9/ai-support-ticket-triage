const { Pool } = require('pg');
const env = require('./env');

const poolConfig = env.DATABASE_URL
  ? { connectionString: env.DATABASE_URL }
  : {
      host: env.DB_HOST,
      port: env.DB_PORT,
      database: env.DB_NAME,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      max: 20, // Max clients in pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client:', err.message);
});

/**
 * Execute parameterized query with duration logging in dev
 */
const query = async (text, params) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (env.NODE_ENV === 'development') {
    // console.log('[DB Query]', { text: text.trim().substring(0, 100), duration: `${duration}ms`, rows: res.rowCount });
  }
  return res;
};

/**
 * Get dedicated client for transaction support
 */
const getClient = () => pool.connect();

/**
 * Quick connection check
 */
const testConnection = async () => {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT NOW() as current_time, current_database() as db');
    return res.rows[0];
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  query,
  getClient,
  testConnection,
};
