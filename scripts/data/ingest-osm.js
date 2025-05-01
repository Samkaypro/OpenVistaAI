/**
 * OpenStreetMap Data Ingestion Script
 * 
 * This script downloads and imports OpenStreetMap (OSM) data into a PostGIS-enabled
 * PostgreSQL database. It focuses on land use and natural features data, which is
 * used to enrich property listings with contextual information.
 * 
 * Requirements:
 * - PostgreSQL with PostGIS extension
 * - osm2pgsql utility installed and available in PATH
 * - Node.js environment variables configured in .env file
 * 
 * Environment Variables:
 * - DB_HOST: PostgreSQL host
 * - DB_PORT: PostgreSQL port
 * - DB_USER: Database username
 * - DB_PASSWORD: Database password
 * - DB_NAME: Database name
 * 
 * The script performs the following operations:
 * 1. Downloads OSM data for a sample area using Overpass API
 * 2. Creates necessary database schema and tables
 * 3. Imports data using osm2pgsql
 * 4. Creates spatial indexes for efficient querying
 * 5. Cleans up temporary files
 */

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
    new winston.transports.File({ filename: 'logs/osm-ingest.log' }),
    new winston.transports.Console()
  ]
});

// OSM data configuration
const DOWNLOAD_DIR = path.join(__dirname, '../../data/osm');
const OSM_SAMPLE_AREA = 'rhode-island'; // Using Rhode Island as a sample
const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

/**
 * Downloads a file from a URL to a local path
 * 
 * @param {string} url - Source URL
 * @param {string} destPath - Destination file path
 * @returns {Promise<void>} Resolves when download is complete
 * @throws {Error} If download fails
 */
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

/**
 * Main function to ingest OSM data into PostGIS database
 * 
 * Process:
 * 1. Creates download directory
 * 2. Downloads OSM data using Overpass API
 * 3. Connects to PostgreSQL database
 * 4. Creates schema and tables
 * 5. Imports data using osm2pgsql
 * 6. Creates spatial indexes
 * 7. Verifies import
 * 8. Cleans up temporary files
 * 
 * @returns {Promise<void>} Resolves when ingestion is complete
 * @throws {Error} If any step fails
 */
async function ingestOSMData() {
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

    // Download OSM data using Overpass API
    const query = `
      [out:xml][timeout:25];
      area["name"="${OSM_SAMPLE_AREA}"]["admin_level"="4"]->.searchArea;
      (
        way["landuse"="farmland"](area.searchArea);
        way["landuse"="meadow"](area.searchArea);
        way["natural"="wood"](area.searchArea);
      );
      out body;
      >;
      out skel qt;
    `;

    const osmFile = path.join(DOWNLOAD_DIR, 'sample.osm');
    
    logger.info('Downloading OSM data');
    await downloadFile(
      `${OVERPASS_API}?data=${encodeURIComponent(query)}`,
      osmFile
    );
    logger.info('Download completed');

    // Connect to database
    await client.connect();
    logger.info('Connected to database');

    // Create schema for OSM data if it doesn't exist
    await client.query('CREATE SCHEMA IF NOT EXISTS osm');
    
    // Create tables for different land types
    await client.query(`
      DROP TABLE IF EXISTS osm.land_parcels;
      CREATE TABLE osm.land_parcels (
        id BIGINT PRIMARY KEY,
        osm_type VARCHAR(50),
        land_use VARCHAR(50),
        name VARCHAR(255),
        area_sqm NUMERIC,
        geom geometry(POLYGON, 4326)
      );
    `);

    // Use osm2pgsql to import data
    logger.info('Importing OSM data to PostGIS');
    const importCmd = `
      osm2pgsql -c -d ${process.env.DB_NAME} \
      -H ${process.env.DB_HOST} \
      -U ${process.env.DB_USER} \
      -W -P ${process.env.DB_PORT} \
      --hstore \
      --slim \
      --cache 500 \
      --style openstreetmap-carto.style \
      ${osmFile}
    `;

    execSync(importCmd, { 
      env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD }
    });

    // Create spatial index
    await client.query('CREATE INDEX IF NOT EXISTS land_parcels_geom_idx ON osm.land_parcels USING GIST (geom)');
    logger.info('Created spatial index');

    // Verify import
    const result = await client.query('SELECT COUNT(*) FROM osm.land_parcels');
    logger.info(`Imported ${result.rows[0].count} land parcel records`);

    // Clean up downloaded files
    fs.rmSync(DOWNLOAD_DIR, { recursive: true, force: true });
    logger.info('Cleaned up temporary files');

    await client.end();
    logger.info('OSM data ingestion completed successfully');

  } catch (error) {
    logger.error('Error during OSM data ingestion:', error);
    process.exit(1);
  }
}

// Run ingestion
ingestOSMData().catch(error => {
  logger.error('Fatal error during ingestion:', error);
  process.exit(1);
}); 