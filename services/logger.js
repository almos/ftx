let log4js = require('log4js');
let config = require('../config');

function init(expressInstance)
{
    log4js.configure(
        {
            appenders: {
                console: { type: 'console' },
                file: { type: 'file', filename: config.getLogFile() }
            },
            categories: {
                default: { appenders: ['file', 'console'], level: config.getLogLevel() }
            }
        });

    if (expressInstance) {
        expressInstance.use(log4js.connectLogger(getLogger(), { level: config.getLogLevel() }));
    }
}

function getLogger() {
    return log4js.getLogger();
}

module.exports = {
    init: init,
    instance: getLogger()
}

