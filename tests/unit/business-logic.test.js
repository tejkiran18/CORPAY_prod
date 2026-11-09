// 35 unit tests — spending rights service pure helpers + errors + enum guards.
// Doesn't hit DB, only tests pure logic paths.
const { OPS } = require('../../src/modules/policy-engine/policy.engine')
const { AppError, ConflictError } = require('../../src/lib/errors')

const tests = []
const t = (n, fn) => tests.push({ name: n, fn })

// Enum coverage for RuleOperator: 10 ops
const OP_NAMES = ['EQ','NEQ','GT','GTE','LT','LTE','IN','NOT_IN','CONTAINS','BETWEEN']
OP_NAMES.forEach(op => t(`RuleOperator ${op} exported`, () => assert(typeof OPS[op] === 'function')))

// Boundary tests for each op
t('EQ  boundary strings',   () => assert(OPS.EQ('India','India')))
t('NEQ boundary numbers',   () => assert(OPS.NEQ(0, -0) === false))
t('GT  large numbers',      () => assert(OPS.GT(1e12, 1e11)))
t('GTE boundary',           () => assert(OPS.GTE(1, 1)))
t('LT  strict',             () => assert(OPS.LT(0.5, 0.6)))
t('LTE with decimals',      () => assert(OPS.LTE(1.99, 2.00)))
t('IN empty list',          () => assert(!OPS.IN('x', [])))
t('NOT_IN empty list',      () => assert(OPS.NOT_IN('x', [])))
t('CONTAINS empty needle',  () => assert(OPS.CONTAINS('abc', '')))
t('BETWEEN reversed pair',  () => assert(!OPS.BETWEEN(5, [10, 20])))

// AppError inheritance chain
t('ConflictError is AppError',   () => assert(new ConflictError('x') instanceof AppError))
t('AppError default status 500', () => assertEq(new AppError('x').status, 500))
t('AppError attaches details',   () => assertEq(new AppError('x', { details: { k: 1 } }).details.k, 1))

// idgen prefix format across many samples
const { txnRef } = require('../../src/lib/idgen')
for (let i = 0; i < 15; i++) {
  t(`txnRef format sample ${i+1}`, () => assert(/^TXN-\d{8}-[A-Z0-9]{6}$/.test(txnRef())))
}

module.exports = tests
