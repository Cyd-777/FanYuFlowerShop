/**
 * 校验模块 import 边界。
 *
 * 规则：若 src/services/{name}.ts 第一行含 @deprecated（已标记为兼容层），
 * 则 src 下非 services/、非 modules/ 的文件不应直接引 @/services/{name}。
 */
const fs = require('fs')
const path = require('path')

const SRC_DIR = path.join(__dirname, '../src')
const SERVICES_DIR = path.join(SRC_DIR, 'services')

/** 判断 services/{name}.ts 是否为纯兼容层（第一行含 @deprecated） */
function isPureCompat(name) {
  var fp = path.join(SERVICES_DIR, name + '.ts')
  if (!fs.existsSync(fp)) return false
  var first = fs.readFileSync(fp, 'utf8').split('\n')[0] || ''
  return first.indexOf('@deprecated') !== -1
}

// 收集所有纯兼容 services
var compat = new Set()
var entries = fs.readdirSync(SERVICES_DIR, { withFileTypes: true })
for (var i = 0; i < entries.length; i++) {
  var e = entries[i]
  if (e.isFile() && e.name.endsWith('.ts')) {
    var name = e.name.replace(/\.ts$/, '')
    if (isPureCompat(name)) compat.add(name)
  }
}

var failed = false
var violations = []
var RE = /from\s+['"]@\/services\/(\w+)(?:\/|['"])/g

function walk(dir) {
  var entries2
  try { entries2 = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
  for (var j = 0; j < entries2.length; j++) {
    var entry = entries2[j]
    var fp = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name.indexOf('.') !== 0) walk(fp)
    } else if (entry.isFile() && /\.(ts|vue)$/.test(entry.name)) {
      check(fp)
    }
  }
}

function check(fp) {
  var rel = path.relative(SRC_DIR, fp)
  if (rel.indexOf('services/') === 0) return
  if (rel.indexOf('modules/') === 0) return

  var content = fs.readFileSync(fp, 'utf8')
  RE.lastIndex = 0
  var m
  while ((m = RE.exec(content))) {
    var svc = m[1]
    if (compat.has(svc)) {
      var line = content.slice(0, m.index).split('\n').length
      violations.push('  ' + rel + ':' + line + '  @/services/' + svc + ' → @/modules/' + svc)
      failed = true
    }
  }
}

walk(SRC_DIR)

if (failed) {
  console.error('[check-module-import-boundary] 以下 services 兼容层被外部引用，应改用 @/modules/*：')
  for (var k = 0; k < violations.length; k++) {
    console.error(violations[k])
  }
  process.exit(1)
}

console.log('[check-module-import-boundary] OK — ' + compat.size + ' compat services, 0 violations')
