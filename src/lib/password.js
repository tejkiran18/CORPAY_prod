const bcrypt = require('bcryptjs')
const ROUNDS = Number(process.env.BCRYPT_ROUNDS || 10)
async function hash(pwd) { return bcrypt.hash(pwd, ROUNDS) }
async function verify(pwd, hashStr) { return bcrypt.compare(pwd, hashStr) }
module.exports = { hash, verify }
