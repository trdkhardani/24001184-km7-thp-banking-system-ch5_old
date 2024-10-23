import SwaggerJsdoc from 'swagger-jsdoc';
const swaggerJsdoc = SwaggerJsdoc;

const options = {
  definition: {
    openapi: '3.0.0', // OpenAPI version
    info: { 
      title: 'Banking System API', // API title
      version: '1.0.0', // API version
      description: 'API documentation for Banking System',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
            scheme: 'bearer',
            bearerFormat: 'JWT',
            type: 'http',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    servers: [
      { url: 'http://localhost:3000', description: 'Local server' },
    ],
  },
  apis: ['./controllers/**/*.js'], // Path to your API docs
};

const swaggerSpec = swaggerJsdoc(options);
export default swaggerSpec;
