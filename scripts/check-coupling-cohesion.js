/**
 * 耦合与内聚检测（2026-07-06）
 *
 * 检出项：
 *   1. LAYER_VIOLATION — 非 data/ 非 modules/ 的文件直接引 @/data/repository
 *      （应经 @/modules/*；已知暂未迁移的 composable 登记在 KNOW_DEBTS）
 *   2. HIGH_PAGE_COUPLING — 单页面引用了 >3 个功能模块（建议拆子组件）
 *   3. DATA_PAGES_COUPLING — data/pages/ 对 repositories 的依赖（info 级，过渡期登记）
 *   4. CF_CROSS_CTX — 不同 bounded context 的云函数 handler 互引
 *   5. MODULE_CYCLIC — 模块循环依赖
 */
const fs = require('fs')
const path = require('path')

const SRC_DIR = path.join(__dirname, '../src')
const CF_DIR = path.join(__dirname, '../cloudfunctions')
const MAX_PAGE_MODULES = 3

/** 已知的 layer violation（待迁移的 composable / utils / store），不阻断 CI */
const KNOWN_DEBTS = []

const MODULE_IMPORT_RE = /from\s+['"]@\/modules\/(\w+)/g
const REPO_IMPORT_RE = /from\s+['"]@\/data\/repository/g

var violations = []

// ─── 1. Layer Violation ───
function checkLayerViolations() {
  walk(SRC_DIR, function(fp, rel) {
    if (!/\.(ts|vue)$/.test(fp)) return
    if (rel.startsWith('data/')) return
    if (rel.startsWith('modules/')) return
    if (rel.startsWith('services/')) return

    var content = fs.readFileSync(fp, 'utf8')
    REPO_IMPORT_RE.lastIndex = 0
    if (!REPO_IMPORT_RE.test(content)) return

    var line = content.slice(0, REPO_IMPORT_RE.lastIndex).split('\n').length
    var known = KNOWN_DEBTS.indexOf(rel) !== -1

    violations.push({
      type: 'LAYER_VIOLATION',
      severity: known ? 'info' : 'error',
      file: rel + ':' + line,
      message: '直接引 @/data/repository（应经 @/modules/*）' +
        (known ? ' （已知待迁移）' : ''),
    })
  })
}

// ─── 2. High Page Coupling ───
function checkPageCoupling() {
  walk(SRC_DIR, function(fp, rel) {
    if (!/pages/.test(rel)) return
    if (!/\.(ts|vue)$/.test(fp)) return

    var content = fs.readFileSync(fp, 'utf8')
    MODULE_IMPORT_RE.lastIndex = 0
    var mods = new Set()
    var m
    while ((m = MODULE_IMPORT_RE.exec(content))) mods.add(m[1])

    if (mods.size > MAX_PAGE_MODULES) {
      violations.push({
        type: 'HIGH_PAGE_COUPLING',
        severity: 'warn',
        file: rel,
        message: '引了 ' + mods.size + ' 个模块 (' + [].concat.apply([], Array.from(mods)).join(', ') + ')，考虑拆子组件',
      })
    }
  })
}

// ─── 3. Data/Pages Repository Dependency ───
function checkDataPagesCoupling() {
  var dp = path.join(SRC_DIR, 'data', 'pages')
  if (!fs.existsSync(dp)) return
  walk(dp, function(fp, rel) {
    if (!/\.(ts|vue)$/.test(fp)) return
    var content = fs.readFileSync(fp, 'utf8')
    var repos = new Set()
    var re2 = /from\s+['"]@\/data\/repository(?:\/(\w+))?/g
    var m2
    while ((m2 = re2.exec(content))) repos.add(m2[1] || 'index')
    if (repos.size > 0) {
      violations.push({
        type: 'DATA_PAGES_COUPLING',
        severity: 'info',
        file: rel,
        message: '依赖: ' + [].concat.apply([], Array.from(repos)).join(', '),
      })
    }
  })
}

// ─── 4. Cross-Context Cloud Function Coupling ───
function checkCrossCtxCoupling() {
  if (!fs.existsSync(CF_DIR)) return

  // 读取各 CF 的 handler 归属（按目录名）
  var ctxMap = {}
  walk(CF_DIR, function(fp, rel) {
    if (!fp.endsWith('.js') || fp.includes('common/') || fp.includes('node_modules')) return
    var parts = rel.split(path.sep)
    var cfName = parts[0]
    if (!ctxMap[cfName]) ctxMap[cfName] = []
    ctxMap[cfName].push(fp)
  })

  // 检查每个 CF 的 handlers 是否引用了其它 CF 模块
  Object.keys(ctxMap).forEach(function(cf) {
    ctxMap[cf].forEach(function(fp) {
      var content = fs.readFileSync(fp, 'utf8')
      var rel = path.relative(CF_DIR, fp)
      // 查找 require 引用到其它 CF 目录的
      var re = /require\(['"]\.\.?\/(\w+)\/handlers/g
      var m
      while ((m = re.exec(content))) {
        if (m[1] !== cf) {
          violations.push({
            type: 'CF_CROSS_CTX',
            severity: 'info',
            file: rel,
            message: cf + ' 引用了 ' + m[1] + ' 的 handler',
          })
        }
      }
    })
  })
}

// ─── 5. Module Cyclic Dependency ───
function checkCyclicModules() {
  var md = path.join(SRC_DIR, 'modules')
  if (!fs.existsSync(md)) return
  var entries = fs.readdirSync(md, { withFileTypes: true })
  var adj = {}
  var allMods = []

  entries.forEach(function(e) {
    if (!e.isDirectory()) return
    var name = e.name
    allMods.push(name)
    adj[name] = []
    var dir = path.join(md, name)
    var files = []
    collectAll(dir, files)
    files.forEach(function(f) {
      var content = fs.readFileSync(f, 'utf8')
      MODULE_IMPORT_RE.lastIndex = 0
      var m
      while ((m = MODULE_IMPORT_RE.exec(content))) {
        if (m[1] !== name) adj[name].push(m[1])
      }
    })
    adj[name] = Array.from(new Set(adj[name]))
  })

  var visited = {}, recStack = {}
  function dfs(mod, path2) {
    visited[mod] = true
    recStack[mod] = true
    for (var i = 0; i < (adj[mod] || []).length; i++) {
      var next = adj[mod][i]
      if (recStack[next]) {
        violations.push({
          type: 'MODULE_CYCLIC',
          severity: 'error',
          file: 'modules/',
          message: '循环: ' + path2.concat([next]).join(' → '),
        })
      } else if (!visited[next]) {
        dfs(next, path2.concat([next]))
      }
    }
    recStack[mod] = false
  }

  for (var k = 0; k < allMods.length; k++) {
    if (!visited[allMods[k]]) dfs(allMods[k], [allMods[k]])
  }
}

// ─── Helpers ───
function walk(dir, cb) {
  var entries
  try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i]
    var fp = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name !== 'node_modules' && e.name.indexOf('.') !== 0) walk(fp, cb)
    } else {
      cb(fp, path.relative(SRC_DIR, fp))
    }
  }
}

function collectAll(dir, result) {
  if (!fs.existsSync(dir)) return
  var entries
  try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i]
    var fp = path.join(dir, e.name)
    if (e.isDirectory()) collectAll(fp, result)
    else if (e.isFile() && /\.(ts|vue)$/.test(e.name)) result.push(fp)
  }
}

// ─── Run ───
checkLayerViolations()
checkPageCoupling()
checkDataPagesCoupling()
checkCrossCtxCoupling()
checkCyclicModules()

// ─── Output ───
var hasError = false
var hasWarn = false

violations.sort(function(a, b) {
  var order = { error: 0, warn: 1, info: 2 }
  return (order[a.severity] || 9) - (order[b.severity] || 9)
})

violations.forEach(function(v) {
  var icon = v.severity === 'error' ? '❌' : v.severity === 'warn' ? '⚠️' : '📋'
  console.log(icon, v.type, '(' + v.severity + ')', v.file)
  console.log('   ', v.message)
  if (v.severity === 'error') hasError = true
  if (v.severity === 'warn') hasWarn = true
})

console.log('')
var total = violations.length
console.log(total + ' 个检出项 — ' + (hasError ? '❌ errors' : '0 error') + ' | ' + (hasWarn ? '⚠️ warns' : '0 warn') + ' | info 不阻断')
if (hasError) process.exit(1)
