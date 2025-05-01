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
    new winston.transports.File({ filename: 'logs/database-test.log' }),
    new winston.transports.Console()
  ]
});

async function testDatabase() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    await client.connect();
    logger.info('Connected to database successfully');

    // Test PostGIS functionality
    const postGisTest = await client.query(`
      SELECT ST_AsText(
        ST_GeomFromText('POINT(-71.064544 42.28787)')
      );
    `);
    logger.info('PostGIS test result:', postGisTest.rows[0]);

    // Test pgRouting functionality
    // Create a sample topology table
    await client.query(`
      CREATE TEMPORARY TABLE IF NOT EXISTS edge_table (
        id SERIAL,
        source INTEGER,
        target INTEGER,
        cost FLOAT,
        reverse_cost FLOAT,
        geom geometry(LINESTRING, 4326)
      );

      INSERT INTO edge_table (source, target, cost, reverse_cost, geom) VALUES 
      (1, 2, 1, 1, ST_GeomFromText('LINESTRING(-71.064544 42.28787, -71.064544 42.28788)', 4326)),
      (2, 3, 1, 1, ST_GeomFromText('LINESTRING(-71.064544 42.28788, -71.064544 42.28789)', 4326));
    `);

    // Test pgRouting function
    const pgRoutingTest = await client.query(`
      SELECT * FROM pgr_dijkstra(
        'SELECT id, source, target, cost, reverse_cost FROM edge_table',
        1, 3, directed := false
      );
    `);
    logger.info('pgRouting test result:', pgRoutingTest.rows);

    // Clean up
    await client.query('DROP TABLE IF EXISTS edge_table');

    await client.end();
    logger.info('All database tests completed successfully');
    process.exit(0);

  } catch (error) {
    logger.error('Error during database testing:', error);
    process.exit(1);
  }
}

// Run tests
testDatabase().catch(error => {
  logger.error('Fatal error during testing:', error);
  process.exit(1);
}); 