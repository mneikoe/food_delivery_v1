const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Chatora Adda Food Delivery API",
      version: "1.0.0",
      description: "Hardened Production API Documentation for the Swiggy-like Food Delivery App"
    },
    servers: [
      {
        url: "http://localhost:8080",
        description: "Local Server"
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  // Look for annotations in routes
  apis: ["./src/routes/*.js", "./src/controllers/*.js"]
};

const swaggerSpec = swaggerJsdoc(options);

const setupSwagger = (app) => {
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  console.log("Swagger API docs initialized at /api/docs");
};

module.exports = setupSwagger;
