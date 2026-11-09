const pino = require('pino')

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: { service: 'corpay-api' },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: ['password', '*.password', 'passwordHash', '*.passwordHash', 'authorization', 'req.headers.authorization'],
    censor: '[REDACTED]'
  }
})

module.exports = { logger }
