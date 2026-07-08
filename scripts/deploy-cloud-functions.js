/**
 * 一键部署云函数 — 全自动管道
 *
 * 流程：sync:common → npm install（各 CF 首次自动装）→ tcb fn deploy
 *
 * 用法：
 *   npm run deploy:cloud                          # 部署全部
 *   npm run deploy:cloud -- --only goods,wiki     # 只部署指定 CF
 *   npm run deploy:cloud -- --only goods --no-sync  # 跳过 sync-common
 *   npm run deploy:cloud -- --check               # 只检查不部署
 */
const { execSync, spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const cloudRoot = path.join(root, 'cloudfunctions')
const envFile = path.join(root, 'src/config/env.ts')

// ── 参数解析 ──

function hasFlag(name) {
  return process.argv.includes('--' + name)
}

function parseOnly() {
  const idx = process.argv.indexOf('--only')
  if (idx === -1) return null
  return (process.argv[idx + 1] || '').split(',').map((s) => s.trim()).filter(Boolean)
}

// ── 工具 ──

function readEnvId() {
  if (process.env.CLOUD_ENV_ID?.trim()) return process.env.CLOUD_ENV_ID.trim()
  const source = fs.readFileSync(envFile, 'utf8')
  const match = source.match(/export const CLOUD_ENV_ID = ['"]([^'"]+)['"]/)
  if (!match?.[1]) {
    throw new Error('未找到 CLOUD_ENV_ID，请配置 src/config/env.ts 或设置环境变量 CLOUD_ENV_ID')
  }
  return match[1]
}

function listAllCFs() {
  return fs
    .readdirSync(cloudRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== 'common' && e.name !== 'node_modules')
    .map((e) => e.name)
    .filter((name) => fs.existsSync(path.join(cloudRoot, name, 'index.js')))
    .sort()
}

function ensureTcb() {
  const probe = spawnSync('tcb', ['--version'], { encoding: 'utf8' })
  if (probe.error || probe.status !== 0) {
    throw new Error('未检测到 tcb CLI，请执行：npm i -g @cloudbase/cli && tcb login')
  }
}

function needsNpmInstall(cfDir) {
  const pkg = path.join(cfDir, 'package.json')
  const lock = path.join(cfDir, 'package-lock.json')
  const nm = path.join(cfDir, 'node_modules')
  if (!fs.existsSync(pkg)) return false
  if (!fs.existsSync(nm)) return true
  const pkgMtime = fs.statSync(pkg).mtimeMs
  const nmMtime = fs.statSync(nm).mtimeMs
  if (pkgMtime > nmMtime + 5000) return true
  const wrapMtime = path.join(cfDir, 'node_modules', 'wx-server-sdk') ? 0 : 0
  try {
    const wrapStat = fs.statSync(path.join(cfDir, 'node_modules', 'wx-server-sdk'))
    return pkgMtime > wrapStat.mtimeMs + 5000
  } catch {
    return true
  }
}

function npmInstall(cfDir, name) {
  console.log(`\n  📦 ${name} — npm install...`)
  execSync('npm install --production --ignore-scripts 2>/dev/null || npm install --production', {
    cwd: cfDir,
    stdio: 'pipe',
  })
  // sharp 需要编译原生模块，允许失败
  if (fs.existsSync(path.join(cfDir, 'node_modules', 'sharp'))) {
    try {
      execSync('npx --yes sharp 2>/dev/null || true', { cwd: cfDir, stdio: 'pipe' })
    } catch {
      // ignore sharp rebuild failures
    }
  }
}

function deployOne(name, envId) {
  const cfDir = path.join(cloudRoot, name)
  const size = countFiles(cfDir)
  console.log(`  🚀 ${name} (${size} files)`)

  execSync(`tcb fn deploy ${name} -e ${envId} --force --yes --dir ${cfDir}`, {
    cwd: cloudRoot,
    stdio: 'pipe',
  })
}

function countFiles(dir) {
  let count = 0
  function walk(d) {
    try {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        if (e.name === 'node_modules' || e.name === '.git') continue
        if (e.isDirectory()) walk(path.join(d, e.name))
        else count++
      }
    } catch { /* skip */ }
  }
  walk(dir)
  return count
}

// ── 主流程 ──

function main() {
  const only = parseOnly()
  const checkMode = hasFlag('check')
  const skipSync = hasFlag('no-sync')

  console.log('')
  console.log('╔══════════════════════════════════════╗')
  console.log('║     云函数部署管道                    ║')
  console.log('╚══════════════════════════════════════╝')
  console.log('')

  // 1. 读取环境 & 列举 CF
  const envId = readEnvId()
  const all = listAllCFs()
  let targets = only ? all.filter((name) => only.includes(name)) : all

  if (!targets.length) {
    console.error('没有待部署的云函数')
    process.exit(1)
  }

  if (only) {
    const missing = only.filter((name) => !all.includes(name))
    if (missing.length) {
      console.error(`未知云函数：${missing.join(', ')}`)
      console.error(`可用：${all.join(', ')}`)
      process.exit(1)
    }
  }

  console.log(`  环境：  ${envId}`)
  console.log(`  目标：  ${targets.join(', ')}`)
  if (checkMode) {
    console.log('  模式：  🔍 仅检查（--check）')
  }
  console.log('')

  // 2. 同步 common 模块
  if (!skipSync && !checkMode) {
    console.log('  ── 同步 common/ 模块 ──')
    execSync('node scripts/sync-cloud-common.js', { cwd: root, stdio: 'inherit' })
    console.log('')
  }

  // 3. 前置检查（check 模式到此结束）
  if (checkMode) {
    console.log('  🔍 检查完成，未部署')
    return
  }

  ensureTcb()

  // 4. npm install
  const needsInstall = targets.filter((name) => needsNpmInstall(path.join(cloudRoot, name)))
  if (needsInstall.length) {
    console.log('  ── 安装依赖 ──')
    console.log(`  需要安装：${needsInstall.join(', ')}`)
    for (const name of needsInstall) {
      npmInstall(path.join(cloudRoot, name), name)
    }
    console.log('')
  }

  // 5. 部署
  console.log('  ── 部署 ──')
  let failed = []
  let succeeded = []

  for (const name of targets) {
    try {
      deployOne(name, envId)
      succeeded.push(name)
    } catch (err) {
      console.error(`  ❌ ${name} 部署失败`)
      failed.push(name)
    }
  }

  console.log('')
  if (failed.length) {
    console.log(`  ❌ 失败：${failed.join(', ')}`)
    console.log(`  ✅ 成功：${succeeded.join(', ')}`)
    process.exit(1)
  }
  console.log(`  ✅ 全部部署完成（${succeeded.join(', ')}）`)
}

main()
