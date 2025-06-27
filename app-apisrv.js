let http = require('http'),
  path = require('path'),
  methods = require('methods'),
  express = require('express'),
  bodyParser = require('body-parser'),
  session = require('express-session'),
  cors = require('cors'),
  errorhandler = require('errorhandler'),
  config = require('./config'),
  swaggerUi = require('swagger-ui-express'),
  yaml = require('yamljs');

// Create global app object
let app = express();

app.use(cors());

/**
 * Normal express config defaults
 */
app.use(require('morgan')('dev'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(require('method-override')());
app.use(express.static(__dirname + '/public'));
app.use(
  session({
    secret: 'ftx',
    cookie: { maxAge: 60000 },
    resave: false,
    saveUninitialized: false,
  }),
);

// if (!config.isProduction()) {
app.use(errorhandler());
// }

/**
 * Logger setup
 */
let logger = require('./services/logger');
logger.init(app);

/**
 * Connecting to MongoDB
 */
let databaseConnectionReady = require('./config/beans/mongoose').connect();

/**
 * Initialize job scheduling subsystem
 */
let agenda = require('./config/beans/agenda');
let agendaStarted = databaseConnectionReady
  .then(() => agenda.connect())
  .then(() => agenda.waitStart())
  .then(() => {
    logger.instance.info('Job scheduling subsystem has been initialized');
  })
  .catch((e) => {
    logger.instance.error(`Error initializing job execution subsystem. Error: ${e.message}`, e);
  });

/**
 * Swagger
 */
const swaggerDocument = yaml.load('./swagger/ft.yaml');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

/**
 * Redis
 */
require('./config/beans/redis');

/**
 * Importing routes
 */
app.use(require('./routes'));

/**
 * Initializing event bus and influx logging listeners
 */
require('./services/influx');

/**
 * catch 404 and forward to error handler
 */
app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

/// error handlers

// development error handler
// will print stacktrace
app.use(function (err, req, res, next) {
  // console.log(err.stack);
  if (err.custom && err.parent) {
    logger.instance.error(err.parent.message);
  }

  logger.instance.error(err.stack);

  res.status(err.status || 500);

  res.json({
    error: {
      message: err.message,
      error: err,
    },
  });
});

let httpServerStartedCallback;
let httpServerStarted = new Promise((resolve) => {
  httpServerStartedCallback = resolve;
});

Promise.all([agendaStarted, httpServerStarted]).then(() => {
  if (global.startupCompletedCallback) global.startupCompletedCallback();
});

// finally, let's start our server...
let server = app.listen(config.server.getPort(), function () {
  console.log(`Listening on port ${server.address().port}`);
  httpServerStartedCallback();
});

module.exports = server;
