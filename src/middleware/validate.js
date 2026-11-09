const { ValidationError } = require('../lib/errors')
function validate(schema, data) {
  const r = schema.safeParse(data)
  if (!r.success) throw new ValidationError(r.error.issues.map(i => ({ path: i.path.join('.'), message: i.message })))
  return r.data
}
module.exports = { validate }
