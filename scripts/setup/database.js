const { Client } = require('pg');
const { config } = require('dotenv');
const winston = require('winston');

// Load environment variables
config();

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/database-setup.log' }),
    new winston.transports.Console()
  ]
});

async function createDatabase() {
  // Connect to PostgreSQL server to create database
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'postgres' // Connect to default database first
  });

  try {
    await client.connect();
    logger.info('Connected to PostgreSQL server');

    // Create database if it doesn't exist
    await client.query(`
      SELECT 'CREATE DATABASE ${process.env.DB_NAME}'
      WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${process.env.DB_NAME}')
    `);
    logger.info(`Database ${process.env.DB_NAME} created or already exists`);

    // Close connection to postgres database
    await client.end();

    // Connect to our new database
    const dbClient = new Client({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    await dbClient.connect();
    logger.info(`Connected to ${process.env.DB_NAME} database`);

    // Enable PostGIS extension
    await dbClient.query('CREATE EXTENSION IF NOT EXISTS postgis');
    logger.info('PostGIS extension enabled');

    // Enable pgRouting extension
    await dbClient.query('CREATE EXTENSION IF NOT EXISTS pgrouting');
    logger.info('pgRouting extension enabled');

    // Create schemas
    await dbClient.query(`
      CREATE SCHEMA IF NOT EXISTS gis;
      CREATE SCHEMA IF NOT EXISTS app;
    `);
    logger.info('Schemas created');

    // Verify extensions
    const extensions = await dbClient.query(`
      SELECT extname, extversion 
      FROM pg_extension 
      WHERE extname IN ('postgis', 'pgrouting');
    `);
    logger.info('Enabled extensions:', extensions.rows);

    await dbClient.end();
    logger.info('Database setup completed successfully');

  } catch (error) {
    logger.error('Error during database setup:', error);
    process.exit(1);
  }
}

// Run setup
createDatabase().catch(error => {
  logger.error('Fatal error during setup:', error);
  process.exit(1);
}); 