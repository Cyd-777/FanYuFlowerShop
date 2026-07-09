/**
 * 文档质量检测（2026-07-07）
 *
 * 检出项：
 *   1. DEAD_LINK        — 文档内链指向不存在的文件（error）
 *   2. NAMING_VIOLATION — 非待处理文件不按 {名}模块[-{功能}][-API].md 命名（error）
 *   3. MISSING_STRATEGY — {名}模块.md 缺少 ## 策略 章节（warn）
 *   4. API_DEVIATION    — api.ts export 与 -API.md 表格记录不一致（warn）
 *   5. ORPHAN_FILE      — 模块文档未被任何索引或父文档引用（info）
 *   6. MIGRATION_STALE  — 待处理声明已迁入但目标文件不存在（error）
 */
var fs = require('fs')
var path = require('path')

var DOCS_DIR = path.join(__dirname, '../docs')
var MODULES_DIR = path.join(__dirname, '../src/modules')

var violations = []
var exitCode = 0

/** 已知的命名不合规文件（历史遗留），不阻断 CI */
var KNOWN_NAMING_DEBTS = [
  '架构耦合内聚优化.md',
  '模块封装-升级策略.md',
  '模块封装与API.md',
  '自选花束与导购策略.md',
  '词条enrichment批次.md',
  '智库模块-玫瑰养护试点.md',
  '项目上下文补充.md',
  '🎯 工作面板.md',
  '🎯 工作面板.md',
  '商城分类页-L1L2重构设计.md',
  '商城分类页-组件需求.md',
]

/** 已知的孤立文件（子功能文档未被索引），不报警 */
var KNOWN_ORPHAN_DEBTS = [
  '智库模块-外部预填与笔记编辑.md',
  '智库模块-智能粘贴提示词.md',
  '智库模块-笔记式行内编辑.md',
  '地址模块-API.md',
  '购物车模块-API.md',
  '花卉目录模块-API.md',
  '智库模块-玫瑰养护试点.md',
  '架构耦合内聚优化.md',
  '模块封装-升级策略.md',
  '模块封装与API.md',
  '自选花束与导购策略.md',
  '词条enrichment批次.md',
  '项目上下文补充.md',
  '🎯 工作面板.md',
  '🎯 工作面板.md',
  '商城分类页-L1L2重构设计.md',
  '商城分类页-组件需求.md',
]

// ─── Helpers ───

function walk(dir, fn) {
  if (!fs.existsSync(dir)) return
  for (var entry of fs.readdirSync(dir, { withFileTypes: true })) {
    var full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue
      walk(full, fn)
      continue
    }
    fn(full, entry.name)
  }
}

function readFile(fp) {
  try { return fs.readFileSync(fp, 'utf8') } catch (e) { return '' }
}

function addViolation(type, severity, file, message) {
  violations.push({ type: type, severity: severity, file: file, message: message })
  if (severity === 'error') exitCode = 1
  console.log('  [' + severity.toUpperCase() + '] ' + type + ' — ' + file + ' — ' + message)
}

var mdLinkRe = /\]\(\.\/([^)]+?\.md)\)/g
var mdDocsRe = /^(.+)模块(?:-(.+))?\.md$/
var apiDocRe = /^(.+)模块-API\.md$/
var modRe = /^(.+)模块\.md$/
var isSpecialFile = function(name) {
  return name === '🎛️ CURRENT.md' || name === '🎛️ DONE.md' ||
         name === 'README.md' || name === '文档清单.md'
}
var isInPending = function(fp) {
  return fp.indexOf(path.sep + '待处理' + path.sep) !== -1
}

// ─── 1. Dead Link ───

function checkDeadLinks() {
  console.log('\n[check-docs] 1/6 死链检测 …')
  walk(DOCS_DIR, function(fp, name) {
    if (!name.endsWith('.md')) return
    if (isSpecialFile(name)) return
    if (isInPending(fp)) return

    var content = readFile(fp)
    var rel = path.relative(DOCS_DIR, fp)
    mdLinkRe.lastIndex = 0
    var m
    while ((m = mdLinkRe.exec(content)) !== null) {
      var raw = m[1]
      if (raw.indexOf('%') !== -1) continue
      var target = path.normalize(path.join(path.dirname(fp), raw))
      if (!fs.existsSync(target)) {
        addViolation('DEAD_LINK', 'error', rel, '链接指向的文件不存在：' + raw)
      }
    }
  })
}

// ─── 2. Naming Convention ───

function checkNamingConvention() {
  console.log('\n[check-docs] 2/6 命名合规检测 …')
  walk(DOCS_DIR, function(fp, name) {
    if (!name.endsWith('.md')) return
    if (isSpecialFile(name)) return
    if (isInPending(fp)) return
    if (KNOWN_NAMING_DEBTS.indexOf(name) !== -1) return

    if (!mdDocsRe.test(name)) {
      addViolation('NAMING_VIOLATION', 'error', name, '文件命名不符合 {名}模块[-{功能}][-API].md 规范')
    }
  })
}

// ─── 3. Missing ## 策略 ───

function checkMissingStrategy() {
  console.log('\n[check-docs] 3/6 模块文档缺策略检测 …')
  walk(DOCS_DIR, function(fp, name) {
    if (!modRe.test(name)) return
    if (isInPending(fp)) return
    var content = readFile(fp)
    if (content.indexOf('## 策略') === -1) {
      addViolation('MISSING_STRATEGY', 'warn', name, '模块文档缺少 ## 策略 章节')
    }
  })
}

// ─── 4. API Deviation ───

var FUNC_EXPORT_RE = /export\s+(async\s+)?function\s+(\w+)/g
var TABLE_FN_RE = /\`(\w+)\(/g

function checkApiDeviation() {
  console.log('\n[check-docs] 4/6 API 偏差检测 …')
  var codeFns = {}
  walk(MODULES_DIR, function(fp, name) {
    if (name !== 'api.ts') return
    var modName = path.basename(path.dirname(path.dirname(fp)))
    if (!codeFns[modName]) codeFns[modName] = new Set()
    var content = readFile(fp)
    FUNC_EXPORT_RE.lastIndex = 0
    var m
    while ((m = FUNC_EXPORT_RE.exec(content)) !== null) {
      codeFns[modName].add(m[2])
    }
  })

  var docFns = {}
  walk(DOCS_DIR, function(fp, name) {
    var match = name.match(apiDocRe)
    if (!match) return
    if (isInPending(fp)) return
    var modName = match[1]
    if (!docFns[modName]) docFns[modName] = new Set()
    var content = readFile(fp)
    TABLE_FN_RE.lastIndex = 0
    var m
    while ((m = TABLE_FN_RE.exec(content)) !== null) {
      docFns[modName].add(m[1])
    }
  })

  for (var modName of Object.keys(codeFns)) {
    var codeSet = codeFns[modName]
    var docSet = docFns[modName]
    if (!codeSet || !docSet) continue
    for (var fn of codeSet) {
      if (!docSet.has(fn)) {
        addViolation('API_DEVIATION', 'warn', modName + ' 模块',
          '代码导出 `' + fn + '` 未出现在 ' + modName + '模块-API.md 中')
      }
    }
    for (var fn2 of docSet) {
      if (!codeSet.has(fn2)) {
        addViolation('API_DEVIATION', 'warn', modName + ' 模块',
          '文档记录 `' + fn2 + '` 在代码 api.ts 中已不存在')
      }
    }
  }
}

// ─── 5. Orphan File ───

function checkOrphanFiles() {
  console.log('\n[check-docs] 5/6 孤立文件检测 …')
  var referenced = new Set()

  var indexFiles = ['README.md', '文档清单.md']
  for (var idx of indexFiles) {
    var fp = path.join(DOCS_DIR, idx)
    if (!fs.existsSync(fp)) continue
    var content = readFile(fp)
    mdLinkRe.lastIndex = 0
    var m
    while ((m = mdLinkRe.exec(content)) !== null) {
      referenced.add(path.basename(m[1]))
    }
  }

  walk(DOCS_DIR, function(fp, name) {
    if (!modRe.test(name)) return
    if (isInPending(fp)) return
    var content = readFile(fp)
    mdLinkRe.lastIndex = 0
    var m
    while ((m = mdLinkRe.exec(content)) !== null) {
      referenced.add(path.basename(m[1]))
    }
  })

  walk(DOCS_DIR, function(fp, name) {
    if (!name.endsWith('.md')) return
    if (isSpecialFile(name)) return
    if (isInPending(fp)) return
    if (modRe.test(name) && referenced.has(name)) return
    if (referenced.has(name)) return
    if (KNOWN_ORPHAN_DEBTS.indexOf(name) !== -1) return

    addViolation('ORPHAN_FILE', 'info', name, '未被 README.md、文档清单.md 或所在模块文档引用')
  })
}

// ─── 6. Migration Declaration Stale ───

var MIGRATION_MAP_RE = /\|\s*`([^`]+)`\s*\|\s*\[(.+?)\]\(([^)]+)\)/g

function checkMigrationStale() {
  console.log('\n[check-docs] 6/6 迁移声明检测 …')
  var readme = path.join(DOCS_DIR, '待处理', 'README.md')
  if (!fs.existsSync(readme)) return
  var content = readFile(readme)

  MIGRATION_MAP_RE.lastIndex = 0
  var m
  while ((m = MIGRATION_MAP_RE.exec(content)) !== null) {
    var targetLink = m[3]
    var targetPath = path.resolve(path.dirname(readme), targetLink)
    if (!fs.existsSync(targetPath)) {
      addViolation('MIGRATION_STALE', 'error', '待处理/README.md',
        '声明 `' + m[1] + '` → `' + m[2] + '`(' + targetLink + ')，但目标文件不存在')
    }
  }
}

// ─── Main ───

function main() {
  console.log('[check-docs] 文档质量检测开始\n')

  checkDeadLinks()
  checkNamingConvention()
  checkMissingStrategy()
  checkApiDeviation()
  checkOrphanFiles()
  checkMigrationStale()

  console.log('\n[check-docs] 检测结束')
  console.log('  总检出 ' + violations.length + ' 项')
  console.log('  error: ' + violations.filter(function(v) { return v.severity === 'error' }).length)
  console.log('  warn:  ' + violations.filter(function(v) { return v.severity === 'warn' }).length)
  console.log('  info:  ' + violations.filter(function(v) { return v.severity === 'info' }).length)

  if (exitCode !== 0) {
    console.log('\n[check-docs] ❌ 存在 error 级问题，请修复后重试')
    process.exit(exitCode)
  }
  console.log('\n[check-docs] ✅ 检测通过')
}

main()
