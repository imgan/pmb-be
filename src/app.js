const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const routes = require('./routes');
const auditLogMiddleware = require('./middlewares/auditLog.middleware');
const { notFoundHandler, errorHandler } = require('./middlewares/error.middleware');

const app = express();

const BODY_LIMIT = process.env.BODY_LIMIT || '15mb';

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: BODY_LIMIT }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api', auditLogMiddleware, routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
