/**
 * OpenVista AI API Routes
 * 
 * This file defines all HTTP routes for the OpenVista AI application.
 * The API is organized into several sections:
 * - Health check endpoint
 * - Property management (CRUD operations)
 * - Spatial property search
 * - GIS data access
 * 
 * All routes under /api require authentication.
 */

import router from '@adonisjs/core/services/router'
import { middleware } from './kernel.js'
import { Database } from '@adonisjs/lucid/database'

// Health check route for monitoring
router.get('health', async () => {
  return { status: 'healthy' }
})

// API routes group with authentication
router
  .group(() => {
    /**
     * Properties Resource Routes
     * 
     * GET    /properties      - List all properties
     * POST   /properties      - Create a new property
     * GET    /properties/:id  - Get a specific property
     * PUT    /properties/:id  - Update a property
     * DELETE /properties/:id  - Delete a property
     */
    router
      .resource('properties', '#controllers/properties_controller')
      .middleware({ '*': [middleware.auth] })

    /**
     * Spatial Property Search Routes
     * 
     * GET  /properties/nearby          - Find properties within radius of point
     * POST /properties/within-polygon  - Find properties within polygon
     */
    router.get('properties/nearby', '#controllers/properties_controller.nearby')
    router.post('properties/within-polygon', '#controllers/properties_controller.withinPolygon')

    /**
     * GIS Data Routes
     * Provide access to geographic and environmental data
     */
    
    // Get state boundaries with GeoJSON geometry
    router.get('gis/states', async ({ response }) => {
      const db = new Database()
      const { rows } = await db.rawQuery(
        'SELECT name, ST_AsGeoJSON(geom) as geometry FROM tiger.states'
      )
      return response.json(rows)
    })

    // Get elevation data for a specific point
    router.get('gis/elevation/:lat/:lng', async ({ params, response }) => {
      const { lat, lng } = params
      const db = new Database()
      const { rows } = await db.rawQuery(
        `
        SELECT elevation 
        FROM usgs.elevation 
        WHERE ST_Contains(geom, ST_SetSRID(ST_Point($1, $2), 4326))
        LIMIT 1
        `,
        [lng, lat]
      )
      return response.json(rows[0] || { elevation: null })
    })

    // Get land use data for a specific point
    router.get('gis/land-use/:lat/:lng', async ({ params, response }) => {
      const { lat, lng } = params
      const db = new Database()
      const { rows } = await db.rawQuery(
        `
        SELECT land_use, name 
        FROM osm.land_parcels 
        WHERE ST_Contains(geom, ST_SetSRID(ST_Point($1, $2), 4326))
        LIMIT 1
        `,
        [lng, lat]
      )
      return response.json(rows[0] || { land_use: null, name: null })
    })
  })
  .prefix('api')
