// Singleton PrismaClient with connection pooling + query logging.
// Reused across hot-reloads in dev.
const { PrismaClient } = require('@prisma/client')

const globalForPrisma = globalThis

const prisma = globalForPrisma.__corpayPrisma || new PrismaClient({
  log: process.env.NODE_ENV === 'production'
    ? ['error']
    : [{ emit: 'event', level: 'query' }, 'error', 'warn'],
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__corpayPrisma = prisma
}

module.exports = { prisma }
