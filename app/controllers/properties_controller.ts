import { HttpContext } from '@adonisjs/core/http'
import Property from '#models/property'

/**
 * Properties Controller
 *
 * Handles all property-related HTTP requests including CRUD operations
 * and spatial queries. Integrates with PostGIS for geospatial functionality.
 */
export default class PropertiesController {
  /**
   * List properties with optional spatial and attribute filtering
   *
   * Supports pagination and various filter criteria including:
   * - Spatial filters (nearby point, within bounds)
   * - Price range
   * - Acreage range
   * - Property type
   * - Land use
   * - Location (state, county)
   *
   * @param {HttpContext} ctx - The HTTP context
   * @returns Paginated list of properties matching the filter criteria
   */
  async index({ request, response }: HttpContext) {
    const {
      lat,
      lng,
      radius,
      bounds,
      minPrice,
      maxPrice,
      minAcreage,
      maxAcreage,
      propertyType,
      landUse,
      state,
      county,
    } = request.qs()

    let query = Property.query()

    // Apply spatial filters if provided
    if (lat && lng && radius) {
      query = await Property.findNearby(parseFloat(lat), parseFloat(lng), parseFloat(radius))
    }

    if (bounds) {
      const polygonWkt = `POLYGON((${bounds}))`
      query = await Property.findWithinPolygon(polygonWkt)
    }

    // Apply other filters
    if (minPrice) query.where('price', '>=', minPrice)
    if (maxPrice) query.where('price', '<=', maxPrice)
    if (minAcreage) query.where('acreage', '>=', minAcreage)
    if (maxAcreage) query.where('acreage', '<=', maxAcreage)
    if (propertyType) query.where('property_type', propertyType)
    if (landUse) query.where('land_use', landUse)
    if (state) query.where('state', state)
    if (county) query.where('county', county)

    const properties = await query.paginate(request.input('page', 1), 20)
    return response.json(properties)
  }

  /**
   * Display details of a specific property
   *
   * @param {HttpContext} ctx - The HTTP context
   * @returns Property details or 404 if not found
   * @throws {Error} If property with given ID is not found
   */
  async show({ params, response }: HttpContext) {
    const property = await Property.findOrFail(params.id)
    return response.json(property)
  }

  /**
   * Create a new property listing
   *
   * Automatically generates PostGIS geometry from provided
   * latitude and longitude coordinates.
   *
   * @param {HttpContext} ctx - The HTTP context
   * @returns Newly created property
   * @throws {Error} If validation fails
   */
  async store({ request, response }: HttpContext) {
    const data = request.only([
      'title',
      'description',
      'price',
      'acreage',
      'propertyType',
      'landUse',
      'address',
      'city',
      'state',
      'zipCode',
      'county',
      'latitude',
      'longitude',
      'zoning',
      'waterRights',
      'mineralRights',
      'roadAccess',
      'utilities',
      'floodZone',
      'elevation',
    ])

    // Create WKT geometry from lat/lng
    if (data.latitude && data.longitude) {
      data.geometry = `POINT(${data.longitude} ${data.latitude})`
    }

    const property = await Property.create(data)
    return response.json(property)
  }

  /**
   * Update an existing property
   *
   * Updates property details and regenerates PostGIS geometry
   * if new coordinates are provided.
   *
   * @param {HttpContext} ctx - The HTTP context
   * @returns Updated property
   * @throws {Error} If property not found or validation fails
   */
  async update({ params, request, response }: HttpContext) {
    const property = await Property.findOrFail(params.id)
    const data = request.only([
      'title',
      'description',
      'price',
      'acreage',
      'propertyType',
      'landUse',
      'address',
      'city',
      'state',
      'zipCode',
      'county',
      'latitude',
      'longitude',
      'zoning',
      'waterRights',
      'mineralRights',
      'roadAccess',
      'utilities',
      'floodZone',
      'elevation',
    ])

    // Update WKT geometry from lat/lng
    if (data.latitude && data.longitude) {
      data.geometry = `POINT(${data.longitude} ${data.latitude})`
    }

    await property.merge(data).save()
    return response.json(property)
  }

  /**
   * Delete a property listing
   *
   * @param {HttpContext} ctx - The HTTP context
   * @returns Empty response with 204 status
   * @throws {Error} If property not found
   */
  async destroy({ params, response }: HttpContext) {
    const property = await Property.findOrFail(params.id)
    await property.delete()
    return response.noContent()
  }

  /**
   * Find properties within a specified polygon
   *
   * Uses PostGIS ST_Within function to find properties
   * whose geometry lies within the provided polygon.
   *
   * @param {HttpContext} ctx - The HTTP context
   * @returns List of properties within the polygon
   * @throws {Error} If polygon is invalid
   */
  async withinPolygon({ request, response }: HttpContext) {
    const { polygon } = request.body()
    const properties = await Property.findWithinPolygon(polygon)
    return response.json(properties)
  }

  /**
   * Find properties near a point
   *
   * Uses PostGIS ST_DWithin function to find properties
   * within the specified radius of a point.
   *
   * @param {HttpContext} ctx - The HTTP context
   * @returns List of nearby properties
   * @throws {Error} If coordinates or radius are invalid
   */
  async nearby({ request, response }: HttpContext) {
    const { lat, lng, radius } = request.qs()
    const properties = await Property.findNearby(
      parseFloat(lat),
      parseFloat(lng),
      parseFloat(radius)
    )
    return response.json(properties)
  }
}
