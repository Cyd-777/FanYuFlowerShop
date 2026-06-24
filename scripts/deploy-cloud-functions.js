/**
 * 一键部署 cloudfunctions/ 下全部云函数（需已安装并登录 CloudBase CLI）
 *
 * 用法：
 *   npm run sync:cloud && npm run deploy:cloud
 *   npm run deploy:cloud -- --only goods,meta
 *   CLOUD_ENV_ID=cloud1-xxx npm run deploy:cloud
 */
const { execSync, spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const cloudRoot = path.join(root, 'cloudfunctions')
const envFile = path.join(root, 'src/config/env.ts')

function readEnvId() {
  if (process.env.CLOUD_ENV_ID?.trim()) {
    return process.env.CLOUD_ENV_ID.trim()
  }
  const source = fs.readFileSync(envFile, 'utf8')
  const match = source.match(/export const CLOUD_ENV_ID = ['"]([^'"]+)['"]/)
  if (!match?.[1]) {
    throw new Error('未找到 CLOUD_ENV_ID，请配置 src/config/env.ts 或设置环境变量 CLOUD_ENV_ID')
  }
  return match[1]
}

function listFunctions() {
  return fs
    .readdirSync(cloudRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== 'common')
    .map((entry) => entry.name)
    .filter((name) => fs.existsSync(path.join(cloudRoot, name, 'index.js')))
    .sort()
}

function parseOnlyArg() {
  const idx = process.argv.indexOf('--only')
  if (idx === -1) return null
  const value = process.argv[idx + 1]
  if (!value) {
    throw new Error('--only 需要函数名列表，例如：--only goods,meta')
  }
  return value.split(',').map((item) => item.trim()).filter(Boolean)
}

function ensureTcb() {
  const probe = spawnSync('tcb', ['--version'], { encoding: 'utf8' })
  if (probe.error || probe.status !== 0) {
    throw new Error('未检测到 tcb CLI，请先执行：npm i -g @cloudbase/cli && tcb login')
  }
}

function deployOne(name, envId) {
  const fnDir = path.join(cloudRoot, name)
  console.log(`\n[deploy:cloud] → ${name} (${fnDir})`)
  execSync(`tcb fn deploy ${name} -e ${envId} --force --yes`, {
    cwd: fnDir,
    stdio: 'inherit',
  })
}

function main() {
  ensureTcb()
  const envId = readEnvId()
  const all = listFunctions()
  const only = parseOnlyArg()
  const targets = only ? all.filter((name) => only.includes(name)) : all

  if (only) {
    const missing = only.filter((name) => !all.includes(name))
    if (missing.length) {
      throw new Error(`未知云函数：${missing.join(', ')}`)
    }
  }

  console.log(`[deploy:cloud] env=${envId}`)
  console.log(`[deploy:cloud] targets=${targets.join(', ')}`)

  execSync('node scripts/sync-cloud-common.js', { cwd: root, stdio: 'inherit' })

  let failed = null
  for (const name of targets) {
    try {
      deployOne(name, envId)
    } catch (err) {
      failed = name
      console.error(`[deploy:cloud] failed: ${name}`)
      break
    }
  }

  if (failed) {
    process.exit(1)
  }

  console.log('\n[deploy:cloud] 全部完成')
}

main()
