/**
 * 校验云端 INVALIDATION_MATRIX 与前端 CACHE_INVALIDATION_MATRIX 模块列表一致。
 */
const fs = require('fs')
const path = require('path')

const cloudSrc = fs.readFileSync(
  path.join(__dirname, '../cloudfunctions/common/cacheInvalidation.js'),
  'utf8',
)
const clientSrc = fs.readFileSync(
  path.join(__dirname, '../src/data/cacheInvalidationMatrix.ts'),
  'utf8',
)

function parseCloudMatrix(src) {
  const block = src.match(/INVALIDATION_MATRIX\s*=\s*\{([\s\S]*?)\n\}/)
  if (!block) throw new Error('INVALIDATION_MATRIX not found in cloud file')
  const events = {}
  const re = /(\w+):\s*\[([^\]]*)\]/g
  let m
  while ((m = re.exec(block[1]))) {
    events[m[1]] = m[2]
      .split(',')
      .map((s) => s.replace(/['"\s]/g, ''))
      .filter(Boolean)
      .sort()
  }
  return events
}

function parseClientMatrix(src) {
  const events = {}
  const re = /(\w+):\s*\{[\s\S]*?modules:\s*\[([^\]]+)\]/g
  let m
  while ((m = re.exec(src))) {
    events[m[1]] = m[2]
      .split(',')
      .map((s) => s.replace(/['"\s]/g, ''))
      .filter(Boolean)
      .sort()
  }
  return events
}

const cloudMatrix = parseCloudMatrix(cloudSrc)
const clientMatrix = parseClientMatrix(clientSrc)
const cloudEvents = Object.keys(cloudMatrix)
const clientEvents = Object.keys(clientMatrix)

let failed = false

for (const key of cloudEvents) {
  if (!clientEvents.includes(key)) {
    console.error('[check-cache-matrix] 前端缺少事件:', key)
    failed = true
  }
}

for (const key of clientEvents) {
  if (!cloudEvents.includes(key)) {
    console.error('[check-cache-matrix] 云端缺少事件:', key)
    failed = true
  }
}

for (const key of cloudEvents) {
  const cloudModules = cloudMatrix[key].join(',')
  const clientModules = (clientMatrix[key] || []).join(',')
  if (clientModules !== cloudModules) {
    console.error('[check-cache-matrix] modules 不一致:', key, { cloud: cloudModules, client: clientModules })
    failed = true
  }
}

if (failed) {
  process.exit(1)
}

console.log('[check-cache-matrix] OK —', cloudEvents.length, 'events aligned')
