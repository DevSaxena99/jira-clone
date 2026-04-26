const swaggerJsdoc = require('swagger-jsdoc')

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title:       'Jira Clone Backend API',
      version:     '1.0.0',
      description: 'Project management platform — RESTful API with real-time WebSocket sync'
    },
    servers: [
      { url: '/', description: 'Current environment' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type:         'http',
          scheme:       'bearer',
          bearerFormat: 'JWT',
          description:  'Obtain a JWT from POST /api/auth/login'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error:   { type: 'string', example: 'VALIDATION_ERROR' },
            message: { type: 'string', example: 'title is required' }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            nextCursor: { type: 'string', nullable: true },
            hasMore:    { type: 'boolean' },
            limit:      { type: 'integer' }
          }
        }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  apis: ['./src/routes/*.js']
}

module.exports = swaggerJsdoc(options)
