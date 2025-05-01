# OpenVista AI

OpenVista AI 

## Architecture

The application is built using:
- AdonisJS (TypeScript-based web framework)
- PostgreSQL with PostGIS extension
- Node.js for data ingestion scripts
- Winston for logging

## Prerequisites

- Node.js >= 18.0.0
- PostgreSQL 15+ with PostGIS extension
- PostGIS utilities:
  - shp2pgsql (for TIGER data)
  - osm2pgsql (for OpenStreetMap data)
- (Optional) Docker for containerized development

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Samkaypro/OpenVistaAI.git
   cd openvista
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create and configure environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials and other settings
   ```

4. Set up the database:
   ```bash
   # Create database and enable extensions
   npm run setup:db
   
   # Run migrations
   npm run db:migrate
   ```

5. Ingest GIS data:
   ```bash
   # Run data ingestion scripts
   node scripts/data/ingest-tiger.js
   node scripts/data/ingest-usgs.js
   node scripts/data/ingest-osm.js
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

## API Documentation

See [API.md](docs/API.md) for detailed API documentation.

### Quick Examples

1. List properties within 10 miles of a point:
   ```http
   GET /api/properties/nearby?lat=42.3601&lng=-71.0589&radius=10
   ```

2. Find properties within a polygon:
   ```http
   POST /api/properties/within-polygon
   {
     "polygon": "POLYGON((-71 42, -70 42, -70 43, -71 43, -71 42))"
   }
   ```

3. Get elevation data for a point:
   ```http
   GET /api/gis/elevation/42.3601/-71.0589
   ```

## Development

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

### Building for Production
```bash
npm run build
```

## Troubleshooting

### Database Issues

1. Verify PostGIS installation:
   ```sql
   SELECT PostGIS_Version();
   ```

2. Check if extensions are enabled:
   ```sql
   SELECT * FROM pg_extension;
   ```

3. Verify data ingestion:
   ```sql
   SELECT COUNT(*) FROM tiger.states;
   SELECT COUNT(*) FROM usgs.elevation;
   SELECT COUNT(*) FROM osm.land_parcels;
   ```

### Data Ingestion Issues

1. Check logs in `logs/` directory:
   - `tiger-ingest.log`
   - `usgs-ingest.log`
   - `osm-ingest.log`

2. Verify utility installations:
   ```bash
   shp2pgsql --version
   osm2pgsql --version
   ```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) for details
