const app = require('./app');
const env = require('./config/env');
const db = require('./config/db');

const startServer = async () => {
  try {
    // 1. Verify PostgreSQL connection
    console.log(`[DB] Connecting to PostgreSQL at ${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}...`);
    const dbInfo = await db.testConnection();
    console.log(`[DB] Connected successfully! Server time: ${dbInfo.current_time}`);

    // 2. Start HTTP server
    const server = app.listen(env.PORT, () => {
      console.log(`
=====================================================
  AI Support Ticket Triage Backend API
  Server running at: http://localhost:${env.PORT}
  Environment:       ${env.NODE_ENV}
  Database:          ${env.DB_NAME}
  AI Provider:       ${env.AI_PROVIDER}
=====================================================
      `);
    });

    // Graceful Shutdown
    const shutdown = async (signal) => {
      console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        console.log('[Server] HTTP server closed.');
        try {
          await db.pool.end();
          console.log('[DB] Database connection pool drained.');
          process.exit(0);
        } catch (err) {
          console.error('[DB] Error during pool shutdown:', err);
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();
