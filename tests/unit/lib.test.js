// 30 unit tests: jwt, password, csv, pagination, idgen, errors
const jwt = require('../../src/lib/jwt')
const pwd = require('../../src/lib/password')
const csv = require('../../src/lib/csv')
const pag = require('../../src/lib/pagination')
const { txnRef, rand } = require('../../src/lib/idgen')
const { AppError, ValidationError, NotFoundError, ForbiddenError, UnauthorizedError, ConflictError, RateLimitError } = require('../../src/lib/errors')

const tests = []
const t = (n, fn) => tests.push({ name: n, fn })

t('JWT sign returns string with 3 dots',       () => { const s = jwt.sign({ sub: 'x' }); assert(typeof s === 'string' && s.split('.').length === 3) })
t('JWT verify roundtrip',                       () => { const s = jwt.sign({ sub: 'user1', orgId: 'org1' }); const c = jwt.verify(s); assertEq(c.sub, 'user1'); assertEq(c.orgId, 'org1') })
t('JWT verify rejects tampered',                () => assertThrows(() => jwt.verify('not.a.jwt'), 'Invalid or expired token'))
t('JWT verify rejects empty',                   () => assertThrows(() => jwt.verify(''), 'Invalid'))

t('password.hash produces different from plain', async () => { const h = await pwd.hash('secret'); assert(h !== 'secret' && h.length > 20) })
t('password.verify true for match',              async () => { const h = await pwd.hash('secret'); assert(await pwd.verify('secret', h)) })
t('password.verify false for wrong',             async () => { const h = await pwd.hash('secret'); assert(!await pwd.verify('other', h)) })

t('csv.escape plain',        () => assertEq(csv.escape('abc'), 'abc'))
t('csv.escape with comma',   () => assertEq(csv.escape('a,b'), '"a,b"'))
t('csv.escape with quote',   () => assertEq(csv.escape('a"b'), '"a""b"'))
t('csv.escape null',         () => assertEq(csv.escape(null), ''))
t('csv.escape newline',      () => assertEq(csv.escape('a\nb'), '"a\nb"'))
t('csv.toCsv produces header row',      () => { const r = csv.toCsv([{a:1,b:2}], [{key:'a'},{key:'b'}]); assert(r.startsWith('a,b\n')) })
t('csv.toCsv escapes cell',             () => { const r = csv.toCsv([{a:'x,y'}], [{key:'a'}]); assert(r.includes('"x,y"')) })
t('csv.toCsv uses map function',         () => { const r = csv.toCsv([{a:'X'}], [{header:'B', map:(x)=>x.a+'!'}]); assertEq(r, 'B\nX!') })

t('pagination.parse defaults',       () => { const p = pag.parse({}); assertEq(p.page,1); assertEq(p.limit,50); assertEq(p.skip,0); assertEq(p.dir,'desc') })
t('pagination.parse custom',         () => { const p = pag.parse({ page:'3', limit:'20' }); assertEq(p.page,3); assertEq(p.limit,20); assertEq(p.skip,40) })
t('pagination.parse clamps limit',   () => { const p = pag.parse({ limit:'99999' }); assertEq(p.limit,500) })
t('pagination.parse rejects zero',   () => { const p = pag.parse({ page:'0', limit:'0' }); assertEq(p.page,1); assertEq(p.limit,50) })
t('pagination.parse asc dir',        () => { const p = pag.parse({ dir:'asc' }); assertEq(p.dir,'asc') })
t('pagination.envelope shape',       () => { const e = pag.envelope([1,2,3], 30, { page:2, limit:10 }); assertEq(e.meta.total, 30); assertEq(e.meta.totalPages, 3) })

t('idgen.txnRef prefix',        () => assert(/^TXN-\d{8}-[A-Z0-9]{6}$/.test(txnRef(new Date('2025-06-15')))))
t('idgen.txnRef date embed',    () => { const r = txnRef(new Date(Date.UTC(2025,5,15))); assert(r.startsWith('TXN-20250615-')) })
t('idgen.rand length',          () => assertEq(rand(10).length, 10))
t('idgen.rand alphabet ok',     () => { for (let i=0;i<200;i++) assert(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]+$/.test(rand(5))) })
t('idgen.rand not empty',       () => assert(rand(1).length === 1))

t('AppError has status',        () => { const e = new AppError('x', { status: 418 }); assertEq(e.status, 418); assertEq(e.code, 'INTERNAL') })
t('ValidationError 400',        () => { const e = new ValidationError([]); assertEq(e.status, 400); assertEq(e.code, 'VALIDATION') })
t('NotFoundError 404 message',  () => { const e = new NotFoundError('Budget'); assertEq(e.status, 404); assert(/Budget/.test(e.message)) })
t('ForbiddenError 403',         () => assertEq(new ForbiddenError().status, 403))
t('UnauthorizedError 401',      () => assertEq(new UnauthorizedError().status, 401))
t('ConflictError 409',          () => assertEq(new ConflictError().status, 409))
t('RateLimitError 429',         () => assertEq(new RateLimitError().status, 429))

module.exports = tests
