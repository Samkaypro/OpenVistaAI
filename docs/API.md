# OpenVista AI API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication
All API endpoints require authentication. Include your API token in the Authorization header:
```
Authorization: Bearer your-token-here
```

## Endpoints

### Properties

#### List Properties
```http
GET /properties
```

Query Parameters:
- `lat` (number): Latitude for proximity search
- `lng` (number): Longitude for proximity search
- `radius` (number): Search radius in miles
- `bounds` (string): Polygon bounds for area search (format: "lon1 lat1, lon2 lat2, lon3 lat3, lon1 lat1")
- `minPrice` (number): Minimum price
- `maxPrice` (number): Maximum price
- `minAcreage` (number): Minimum acreage
- `maxAcreage` (number): Maximum acreage
- `propertyType` (string): Type of property
- `landUse` (string): Land use category
- `state` (string): State code
- `county` (string): County name
- `page` (number): Page number for pagination

Example Response:
```json
{
  "data": [
    {
      "id": 1,
      "title": "Beautiful Farm Land",
      "price": 250000,
      "acreage": 50.5,
      "propertyType": "farm",
      "landUse": "agricultural",
      "geometry": "POINT(-71.064544 42.28787)",
      "address": "123 Farm Road",
      "city": "Rural Town",
      "state": "MA",
      "zipCode": "12345"
    }
  ],
  "meta": {
    "total": 100,
    "per_page": 20,
    "current_page": 1,
    "last_page": 5
  }
}
```

#### Get Single Property
```http
GET /properties/:id
```

Example Response:
```json
{
  "id": 1,
  "title": "Beautiful Farm Land",
  "description": "50 acres of prime farmland...",
  "price": 250000,
  "acreage": 50.5,
  "propertyType": "farm",
  "landUse": "agricultural",
  "geometry": "POINT(-71.064544 42.28787)",
  "address": "123 Farm Road",
  "city": "Rural Town",
  "state": "MA",
  "zipCode": "12345",
  "county": "Worcester",
  "waterRights": true,
  "mineralRights": false,
  "roadAccess": true,
  "utilities": ["electricity", "well"],
  "floodZone": "X",
  "elevation": 500.5
}
```

#### Create Property
```http
POST /properties
```

Request Body:
```json
{
  "title": "Beautiful Farm Land",
  "description": "50 acres of prime farmland...",
  "price": 250000,
  "acreage": 50.5,
  "propertyType": "farm",
  "landUse": "agricultural",
  "address": "123 Farm Road",
  "city": "Rural Town",
  "state": "MA",
  "zipCode": "12345",
  "county": "Worcester",
  "latitude": 42.28787,
  "longitude": -71.064544,
  "waterRights": true,
  "mineralRights": false,
  "roadAccess": true,
  "utilities": ["electricity", "well"],
  "floodZone": "X",
  "elevation": 500.5
}
```

#### Update Property
```http
PUT /properties/:id
```

Request Body: Same as POST /properties

#### Delete Property
```http
DELETE /properties/:id
```

### Spatial Search

#### Find Nearby Properties
```http
GET /properties/nearby?lat=42.3601&lng=-71.0589&radius=10
```

Query Parameters:
- `lat` (number): Latitude
- `lng` (number): Longitude
- `radius` (number): Search radius in miles

#### Find Properties Within Polygon
```http
POST /properties/within-polygon
```

Request Body:
```json
{
  "polygon": "POLYGON((-71 42, -70 42, -70 43, -71 43, -71 42))"
}
```

### GIS Data

#### Get States Data
```http
GET /gis/states
```

Example Response:
```json
[
  {
    "name": "Massachusetts",
    "geometry": {
      "type": "MultiPolygon",
      "coordinates": [...]
    }
  }
]
```

#### Get Elevation Data
```http
GET /gis/elevation/:lat/:lng
```

Example Response:
```json
{
  "elevation": 500.5
}
```

#### Get Land Use Data
```http
GET /gis/land-use/:lat/:lng
```

Example Response:
```json
{
  "land_use": "farmland",
  "name": "Green Acres Farm"
}
```

## Error Responses

### 400 Bad Request
```json
{
  "error": {
    "message": "Invalid input parameters",
    "details": {
      "price": ["Price must be a positive number"]
    }
  }
}
```

### 401 Unauthorized
```json
{
  "error": {
    "message": "Authentication required"
  }
}
```

### 404 Not Found
```json
{
  "error": {
    "message": "Property not found"
  }
}
```

### 500 Server Error
```json
{
  "error": {
    "message": "Internal server error"
  }
}
``` 