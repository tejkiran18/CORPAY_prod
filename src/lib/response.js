const { NextResponse } = require('next/server')
const { AppError } = require('./errors')
const { logger } = require('./logger')

function ok(data, meta) {
  return NextResponse.json({ data, meta, error: null }, { status: 200 })
}
function created(data, meta) {
  return NextResponse.json({ data, meta, error: null }, { status: 201 })
}
function fail(err, req) {
  if (err instanceof AppError) {
    return NextResponse.json({ data: null, error: { code: err.code, message: err.message, details: err.details } }, { status: err.status })
  }
  logger.error({ err: err.message, stack: err.stack, url: req?.url }, 'Unhandled error')
  return NextResponse.json({ data: null, error: { code: 'INTERNAL', message: 'Internal server error' } }, { status: 500 })
}
function raw(body, init) { return new NextResponse(body, init) }
module.exports = { ok, created, fail, raw }
