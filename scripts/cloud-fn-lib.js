/**
 * 云函数部署共用工具（本地列表、哈希、CLI）
 */
const { spawnSync, execSync } = require('child_process')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const cloudRoot = path.join(root, 'cloudfunctions')
const envFile = path.join(root, 'src/config/env.ts')
const manifestPath = path.join(__dirname, '.cloud-functions-manifest.json')
const cacheRoot = path.join(root, '.cloud-fn-diff-cache')

const IGNORE_DIRS = new Set(['node_modules', '.git', '.DS_Store'])

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

function ensureTcb() {
  const probe = spawnSync('tcb', ['--version'], { encoding: 'utf8' })
  if (probe.error || probe.status !== 0) {
    throw new Error('未检测到 tcb CLI，请先执行：npm i -g @cloudbase/cli && tcb login')
  }
}

function listLocalFunctions() {
  return fs
    .readdirSync(cloudRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== 'common')
    .map((entry) => entry.name)
    .filter((name) => fs.existsSync(path.join(cloudRoot, name, 'index.js')))
    .sort()
}

function collectSourceFiles(dir, base = dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      collectSourceFiles(full, base, out)
      continue
    }
    if (!/\.(js|json)$/.test(entry.name)) continue
    if (entry.name === 'config.json') continue
    out.push(path.relative(base, full))
  }
  return out
}

/** 对函数目录源码做稳定哈希（不含 node_modules） */
function hashFunctionDir(dir) {
  if (!fs.existsSync(dir)) return null
  const files = collectSourceFiles(dir).sort()
  if (!files.length) return null
  const hash = crypto.createHash('sha256')
  for (const rel of files) {
    hash.update(rel)
    hash.update('\0')
    hash.update(fs.readFileSync(path.join(dir, rel)))
    hash.update('\0')
  }
  return hash.digest('hex').slice(0, 16)
}

function listLocalFileCount(dir) {
  return collectSourceFiles(dir).length
}

function runTcbJson(args) {
  const result = spawnSync('tcb', args, { encoding: 'utf8' })
  if (result.error) throw result.error
  const raw = (result.stdout || '').trim()
  const jsonStart = raw.indexOf('{')
  const jsonArrayStart = raw.indexOf('[')
  const start =
    jsonStart === -1
      ? jsonArrayStart
      : jsonArrayStart === -1
        ? jsonStart
        : Math.min(jsonStart, jsonArrayStart)
  if (start === -1) {
    throw new Error(`tcb 输出无法解析为 JSON：${raw.slice(0, 200)}`)
  }
  return JSON.parse(raw.slice(start))
}

function fetchRemoteFunctions(envId) {
  const parsed = runTcbJson(['fn', 'list', '-e', envId, '--json'])
  const list = Array.isArray(parsed.data) ? parsed.data : parsed
  const map = new Map()
  for (const item of list) {
    if (!item?.name) continue
    map.set(item.name, {
      name: item.name,
      modifyTime: item.modifyTime || item.ModTime || '',
      status: item.status || item.Status || '',
    })
  }
  return map
}

function remoteCacheDir(envId, name) {
  return path.join(cacheRoot, envId, name)
}

function downloadRemoteFunction(name, envId) {
  const dest = remoteCacheDir(envId, name)
  fs.rmSync(dest, { recursive: true, force: true })
  fs.mkdirSync(dest, { recursive: true })
  execSync(`tcb fn code download ${name} -e ${envId} ${dest}`, {
    cwd: root,
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  return dest
}

function loadManifest(envId) {
  if (!fs.existsSync(manifestPath)) return { envId, functions: {} }
  try {
    const data = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    if (data.envId !== envId) return { envId, functions: {} }
    return data
  } catch {
    return { envId, functions: {} }
  }
}

function saveManifest(envId, functions) {
  fs.writeFileSync(
    manifestPath,
    `${JSON.stringify({ envId, updatedAt: new Date().toISOString(), functions }, null, 2)}\n`,
  )
}

function updateManifestEntry(envId, name, hash) {
  const manifest = loadManifest(envId)
  manifest.functions[name] = {
    hash,
    deployedAt: new Date().toISOString(),
  }
  saveManifest(envId, manifest.functions)
}

function syncCloudCommon() {
  execSync('node scripts/sync-cloud-common.js', { cwd: root, stdio: 'inherit' })
}

function deployOne(name, envId) {
  const fnDir = path.join(cloudRoot, name)
  console.log(`\n[push:cloud] 部署 → ${name}`)
  execSync(`tcb fn deploy ${name} -e ${envId} --force --yes`, {
    cwd: fnDir,
    stdio: 'inherit',
  })
}

module.exports = {
  root,
  cloudRoot,
  manifestPath,
  readEnvId,
  ensureTcb,
  listLocalFunctions,
  hashFunctionDir,
  listLocalFileCount,
  fetchRemoteFunctions,
  downloadRemoteFunction,
  loadManifest,
  updateManifestEntry,
  syncCloudCommon,
  deployOne,
}
