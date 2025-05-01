import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

/**
 * Property Model
 * 
 * Represents a real estate property with geospatial capabilities.
 * This model includes support for PostGIS operations and stores
 * both basic property information and advanced features like
 * water rights, mineral rights, and elevation data.
 */
export default class Property extends BaseModel {
  /**
   * Primary key
   */
  @column({ isPrimary: true })
  declare id: number

  /**
   * Property title/name
   */
  @column()
  declare title: string

  /**
   * Detailed property description
   */
  @column()
  declare description: string

  /**
   * Property price in USD
   */
  @column()
  declare price: number

  /**
   * Property size in acres
   */
  @column()
  declare acreage: number

  /**
   * Type of property (e.g., farm, ranch, timber)
   */
  @column()
  declare propertyType: string

  /**
   * Land use classification
   */
  @column()
  declare landUse: string

  /**
   * PostGIS geometry column for spatial operations
   * Stored as GEOMETRY(Geometry, 4326) in PostgreSQL
   */
  @column({
    prepare: (value) => value ? `ST_GeomFromText('${value}', 4326)` : null,
    serialize: (value) => value ? `ST_AsText(${value})` : null,
  })
  declare geometry: string

  /**
   * Property street address
   */
  @column()
  declare address: string

  /**
   * City/municipality name
   */
  @column()
  declare city: string

  /**
   * State code (2 letters)
   */
  @column()
  declare state: string

  /**
   * ZIP/Postal code
   */
  @column()
  declare zipCode: string

  /**
   * County name
   */
  @column()
  declare county: string

  /**
   * Property latitude (WGS84)
   */
  @column()
  declare latitude: number

  /**
   * Property longitude (WGS84)
   */
  @column()
  declare longitude: number

  /**
   * Zoning classification
   */
  @column()
  declare zoning: string

  /**
   * Whether the property includes water rights
   */
  @column()
  declare waterRights: boolean

  /**
   * Whether the property includes mineral rights
   */
  @column()
  declare mineralRights: boolean

  /**
   * Whether the property has road access
   */
  @column()
  declare roadAccess: boolean

  /**
   * Available utilities (array of strings)
   */
  @column()
  declare utilities: string[]

  /**
   * FEMA flood zone designation
   */
  @column()
  declare floodZone: string

  /**
   * Property elevation in feet above sea level
   */
  @column()
  declare elevation: number

  /**
   * Record creation timestamp
   */
  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  /**
   * Record last update timestamp
   */
  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  /**
   * Find properties within a specified radius of a point
   * 
   * @param lat - Latitude of the center point
   * @param lng - Longitude of the center point
   * @param radiusInMiles - Search radius in miles
   * @returns Query builder instance with spatial filter applied
   */
  static async findNearby(lat: number, lng: number, radiusInMiles: number) {
    return this.query()
      .whereRaw(
        `ST_DWithin(
          geometry::geography,
          ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography,
          ? * 1609.34
        )`,
        [lng, lat, radiusInMiles]
      )
  }

  /**
   * Find properties within a specified polygon
   * 
   * @param polygonWkt - WKT representation of the search polygon
   * @returns Query builder instance with spatial filter applied
   */
  static async findWithinPolygon(polygonWkt: string) {
    return this.query()
      .whereRaw(
        'ST_Within(geometry, ST_GeomFromText(?, 4326))',
        [polygonWkt]
      )
  }
} 