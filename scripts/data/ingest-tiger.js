const { Client } = require('pg');
const { config } = require('dotenv');
const winston = require('winston');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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
    new winston.transports.File({ filename: 'logs/tiger-ingest.log' }),
    new winston.transports.Console()
  ]
});

// TIGER data configuration
const TIGER_YEAR = '2023';
const STATE = 'tl_2023_us_state';
const DOWNLOAD_DIR = path.join(__dirname, '../../data/tiger');
const SHAPEFILE_URL = `https://www2.census.gov/geo/tiger/TIGER${TIGER_YEAR}/${STATE}.zip`;

async function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => reject(err));
    });
  });
}

async function ingestTigerData() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    // Create download directory if it doesn't exist
    if (!fs.existsSync(DOWNLOAD_DIR)) {
      fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
    }

    const zipFile = path.join(DOWNLOAD_DIR, `${STATE}.zip`);
    
    // Download TIGER/Line shapefile
    logger.info(`Downloading TIGER/Line data from ${SHAPEFILE_URL}`);
    await downloadFile(SHAPEFILE_URL, zipFile);
    logger.info('Download completed');

    // Unzip the file
    logger.info('Extracting shapefile');
    execSync(`unzip -o ${zipFile} -d ${DOWNLOAD_DIR}`);

    // Connect to database
    await client.connect();
    logger.info('Connected to database');

    // Create schema for TIGER data if it doesn't exist
    await client.query('CREATE SCHEMA IF NOT EXISTS tiger');
    
    // Create states table
    await client.query(`
      DROP TABLE IF EXISTS tiger.states;
      CREATE TABLE tiger.states (
        gid SERIAL PRIMARY KEY,
        statefp VARCHAR(2),
        statens VARCHAR(8),
        stusps VARCHAR(2),
        name VARCHAR(100),
        geom geometry(MULTIPOLYGON, 4269)
      );
    `);

    // Use shp2pgsql to import shapefile
    const shapeFile = path.join(DOWNLOAD_DIR, `${STATE}.shp`);
    const importCmd = `shp2pgsql -s 4269 -I ${shapeFile} tiger.states | psql -h ${process.env.DB_HOST} -p ${process.env.DB_PORT} -U ${process.env.DB_USER} -d ${process.env.DB_NAME}`;
    
    logger.info('Importing shapefile into database');
    execSync(importCmd, { 
      env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD }
    });

    // Verify import
    const result = await client.query('SELECT COUNT(*) FROM tiger.states');
    logger.info(`Imported ${result.rows[0].count} state records`);

    // Create spatial index
    await client.query('CREATE INDEX IF NOT EXISTS states_geom_idx ON tiger.states USING GIST (geom)');
    logger.info('Created spatial index');

    // Clean up downloaded files
    fs.rmSync(DOWNLOAD_DIR, { recursive: true, force: true });
    logger.info('Cleaned up temporary files');

    await client.end();
    logger.info('TIGER data ingestion completed successfully');

  } catch (error) {
    logger.error('Error during TIGER data ingestion:', error);
    process.exit(1);
  }
}

// Run ingestion
ingestTigerData().catch(error => {
  logger.error('Fatal error during ingestion:', error);
  process.exit(1);
}); 