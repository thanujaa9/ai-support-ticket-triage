/**
 * Database Setup Script
 * Reads schema.sql and seeds.sql and applies them to PostgreSQL.
 * Run via: node database/setup.js
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const config = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'ai_support_triage',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    };

async function runSetup() {
  const client = new Client(config);
  try {
    console.log(`Connecting to PostgreSQL database "${config.database || 'configured database'}"...`);
    await client.connect();
    console.log('Connected successfully!');

    const schemaPath = path.join(__dirname, 'schema.sql');
    const seedsPath = path.join(__dirname, 'seeds.sql');

    console.log('\n--- Applying schema.sql ---');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await client.query(schemaSql);
    console.log('Schema applied successfully.');

    console.log('\n--- Applying seeds.sql ---');
    const seedsSql = fs.readFileSync(seedsPath, 'utf8');
    await client.query(seedsSql);
    console.log('Seed data inserted successfully.');

    console.log('\nDatabase setup complete!');
  } catch (err) {
    console.error('Database setup failed:', err.message);
    if (err.code === '3D000') {
      console.log(`\nHint: Database "${config.database}" does not exist yet.`);
      console.log(`You can create it using PostgreSQL CLI:\n  createdb ${config.database}\n`);
    }
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  runSetup();
}

module.exports = { runSetup };
