// Lightweight test runner — no external framework so it works even without jest.
// Usage: node tests/run.js [suite]
//   suite: unit | integration | api | all (default all)
const fs = require('fs')
const path = require('path')

const suite = process.argv[2] || 'all'
const suites = suite === 'all' ? ['unit', 'integration', 'api'] : [suite]

let total = 0, passed = 0, failed = 0
const failures = []

async function runFile(f) {
  const tests = require(f)
  const name = path.relative(__dirname, f)
  const list = Array.isArray(tests) ? tests : Object.entries(tests).map(([n, fn]) => ({ name: n, fn }))
  for (const t of list) {
    total++
    const label = `${name} › ${t.name}`
    try {
      await t.fn()
      passed++
      if (process.env.VERBOSE) console.log(`  ✓ ${label}`)
    } catch (e) {
      failed++
      failures.push({ label, err: e.message, stack: e.stack })
      console.log(`  ✗ ${label}\n    ${e.message}`)
    }
  }
}

async function walk(dir) {
  if (!fs.existsSync(dir)) return
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f)
    if (fs.statSync(full).isDirectory()) await walk(full)
    else if (f.endsWith('.test.js')) await runFile(full)
  }
}

function assert(cond, msg) { if (!cond) throw new Error(msg || 'Assertion failed') }
function assertEq(a, b, msg) { if (a !== b) throw new Error(msg || `Expected ${b} got ${a}`) }
function assertDeep(a, b, msg) { const A = JSON.stringify(a), B = JSON.stringify(b); if (A !== B) throw new Error(msg || `Expected ${B}\n     got ${A}`) }
function assertThrows(fn, matcher) {
  try { fn() } catch (e) {
    if (matcher && !(matcher instanceof RegExp ? matcher.test(e.message) : String(e.message).includes(matcher))) throw new Error(`Threw "${e.message}", expected to match ${matcher}`)
    return
  }
  throw new Error(`Expected function to throw${matcher ? ` matching ${matcher}` : ''}`)
}
async function assertRejects(fn, matcher) {
  try { await fn() } catch (e) {
    if (matcher && !(matcher instanceof RegExp ? matcher.test(e.message) : String(e.message).includes(matcher))) throw new Error(`Rejected "${e.message}", expected to match ${matcher}`)
    return
  }
  throw new Error(`Expected function to reject${matcher ? ` matching ${matcher}` : ''}`)
}

global.assert = assert; global.assertEq = assertEq; global.assertDeep = assertDeep; global.assertThrows = assertThrows; global.assertRejects = assertRejects

;(async () => {
  const started = Date.now()
  for (const s of suites) await walk(path.join(__dirname, s))
  const dur = Date.now() - started
  console.log('\n' + '='.repeat(60))
  console.log(`Total: ${total} · Passed: ${passed} · Failed: ${failed} · ${dur}ms`)
  if (failed) { console.log('='.repeat(60)); process.exit(1) }
  process.exit(0)
})()
