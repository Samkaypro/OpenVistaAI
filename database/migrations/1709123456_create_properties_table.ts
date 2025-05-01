import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Migration: Create Properties Table
 * 
 * Creates the main properties table with PostGIS support for storing
 * and querying geospatial data. The table includes fields for:
 * - Basic property information (title, description, price)
 * - Location data (address, coordinates, geometry)
 * - Land characteristics (acreage, zoning, land use)
 * - Property rights (water, mineral)
 * - Infrastructure (road access, utilities)
 * - Environmental factors (flood zone, elevation)
 */
export default class extends BaseSchema {
  protected tableName = 'properties'

  async up() {
    // Enable PostGIS extension for geospatial functionality
    await this.db.rawQuery('CREATE EXTENSION IF NOT EXISTS postgis')

    this.schema.createTable(this.tableName, (table) => {
      // Primary key and basic information
      table.increments('id')
      table.string('title').notNullable().comment('Property title/name')
      table.text('description').comment('Detailed property description')
      table.decimal('price', 12, 2).notNullable().comment('Property price in USD')
      table.decimal('acreage', 10, 2).notNullable().comment('Property size in acres')
      table.string('property_type').notNullable().comment('Type of property (e.g., farm, ranch, timber)')
      table.string('land_use').comment('Land use classification')
      
      // Address and location fields
      table.string('address').comment('Property street address')
      table.string('city').comment('City/municipality name')
      table.string('state', 2).comment('State code (2 letters)')
      table.string('zip_code', 10).comment('ZIP/Postal code')
      table.string('county').comment('County name')
      
      // Geographic coordinates (WGS84)
      table.decimal('latitude', 10, 8).comment('Property latitude')
      table.decimal('longitude', 11, 8).comment('Property longitude')
      
      // Property features and rights
      table.string('zoning').comment('Zoning classification')
      table.boolean('water_rights').defaultTo(false).comment('Whether property includes water rights')
      table.boolean('mineral_rights').defaultTo(false).comment('Whether property includes mineral rights')
      table.boolean('road_access').defaultTo(false).comment('Whether property has road access')
      table.json('utilities').defaultTo('[]').comment('Available utilities (array of strings)')
      table.string('flood_zone').comment('FEMA flood zone designation')
      table.decimal('elevation', 8, 2).comment('Elevation in feet above sea level')

      // Timestamps
      table.timestamp('created_at', { useTz: true }).comment('Record creation timestamp')
      table.timestamp('updated_at', { useTz: true }).comment('Record last update timestamp')

      // Add PostGIS geometry column and spatial index
      this.defer(async (db) => {
        // Add geometry column with SRID 4326 (WGS84)
        await db.rawQuery(`
          ALTER TABLE ${this.tableName}
          ADD COLUMN geometry geometry(Geometry, 4326)
          COMMENT 'PostGIS geometry column for spatial operations';
        `)

        // Create spatial index for efficient geospatial queries
        await db.rawQuery(`
          CREATE INDEX ${this.tableName}_geometry_idx
          ON ${this.tableName}
          USING GIST (geometry);
        `)
      })
    })
  }

  /**
   * Reverse the migration
   * Drops the properties table and its associated indexes
   */
  async down() {
    this.schema.dropTable(this.tableName)
  }
} 