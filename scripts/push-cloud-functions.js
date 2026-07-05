/**
 * 对比本地与云端云函数差异，仅上传有变更的函数
 *
 * 用法：
 *   npm run push:cloud                    # 仅对比，不上传
 *   npm run push:cloud -- --yes           # 上传有差异的函数
 *   npm run push:cloud -- --yes --all     # 强制上传全部
 *   npm run push:cloud -- --yes --only wiki,goods
 *   npm run push:cloud -- --yes --remote  # 逐个下载云端代码比对（更准，较慢）
 *   npm run push:cloud -- --yes --no-sync # 跳过 sync-cloud-common
 *
 * 依赖：@cloudbase/cli 已登录（tcb login）
 */
const path = require('path')
const {
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
  cloudRoot,
} = require('./cloud-fn-lib')

function parseFlag(name) {
  return process.argv.includes(name)
}

function parseOnlyArg() {
  const idx = process.argv.indexOf('--only')
  if (idx === -1) return null
  const value = process.argv[idx + 1]
  if (!value) throw new Error('--only 需要函数名列表，例如：--only wiki,goods')
  return value.split(',').map((item) => item.trim()).filter(Boolean)
}

function localFunctionDir(name) {
  return path.join(cloudRoot, name)
}

function classifyFunction(name, envId, options) {
  const fnDir = localFunctionDir(name)
  const localHash = hashFunctionDir(fnDir)
  const fileCount = listLocalFileCount(fnDir)
  const manifest = loadManifest(envId)
  const manifestHash = manifest.functions[name]?.hash

  let remoteHash = null
  let compareMethod = 'manifest'

  if (options.remoteCompare || !manifestHash || manifestHash !== localHash) {
    try {
      if (options.verbose) {
        console.log(`[push:cloud] 下载云端代码 ${name} …`)
      }
      const remoteDir = downloadRemoteFunction(name, envId)
      remoteHash = hashFunctionDir(remoteDir)
      compareMethod = 'remote'
    } catch (err) {
      return {
        name,
        status: 'remote_error',
        localHash,
        fileCount,
        error: String(err.message || err),
      }
    }
  }

  let status = 'synced'
  if (remoteHash != null) {
    status = remoteHash === localHash ? 'synced' : 'changed'
  } else if (manifestHash !== localHash) {
    status = 'changed'
  }

  return {
    name,
    status,
    localHash,
    remoteHash: remoteHash || manifestHash || '-',
    compareMethod,
    fileCount,
    manifestDeployedAt: manifest.functions[name]?.deployedAt || '',
  }
}

function statusLabel(status) {
  const map = {
    synced: '一致',
    changed: '有差异',
    local_only: '仅本地',
    remote_only: '仅云端',
    remote_error: '云端读取失败',
  }
  return map[status] || status
}

function printReport(envId, rows, remoteMap) {
  console.log(`\n[push:cloud] 环境 ${envId}`)
  console.log('[push:cloud] 对比结果：\n')
  console.log(
    '函数名'.padEnd(12) +
      '状态'.padEnd(8) +
      '本地哈希'.padEnd(18) +
      '云端哈希'.padEnd(18) +
      '文件'.padEnd(6) +
      '比对',
  )
  console.log('-'.repeat(72))
  for (const row of rows) {
    const remoteMeta = remoteMap.get(row.name)
    const mod = remoteMeta?.modifyTime ? ` · ${remoteMeta.modifyTime}` : ''
    console.log(
      row.name.padEnd(12) +
        statusLabel(row.status).padEnd(8) +
        String(row.localHash || '-').padEnd(18) +
        String(row.remoteHash || '-').padEnd(18) +
        String(row.fileCount || 0).padEnd(6) +
        `${row.compareMethod || '-'}${row.status === 'remote_error' ? ` ${row.error}` : ''}${row.status === 'synced' ? mod : ''}`,
    )
  }
}

function main() {
  ensureTcb()
  const envId = readEnvId()
  const yes = parseFlag('--yes')
  const all = parseFlag('--all')
  const remoteCompare = parseFlag('--remote')
  const noSync = parseFlag('--no-sync')
  const only = parseOnlyArg()

  if (!noSync) {
    console.log('[push:cloud] sync-cloud-common …')
    syncCloudCommon()
  }

  const localAll = listLocalFunctions()
  const remoteMap = fetchRemoteFunctions(envId)
  let names = only ? only.filter((n) => localAll.includes(n)) : localAll

  if (only) {
    const missing = only.filter((n) => !localAll.includes(n))
    if (missing.length) throw new Error(`未知本地云函数：${missing.join(', ')}`)
  }

  const rows = []
  for (const name of names) {
    if (!remoteMap.has(name)) {
      rows.push({
        name,
        status: 'local_only',
        localHash: hashFunctionDir(localFunctionDir(name)),
        remoteHash: '-',
        compareMethod: '-',
        fileCount: listLocalFileCount(localFunctionDir(name)),
      })
      continue
    }
    rows.push(
      classifyFunction(name, envId, {
        remoteCompare: remoteCompare || all,
        verbose: !only || names.length <= 3,
      }),
    )
  }

  const remoteOnly = [...remoteMap.keys()].filter((n) => !localAll.includes(n)).sort()
  if (remoteOnly.length) {
    console.log(`\n[push:cloud] 仅云端存在（本地无目录）：${remoteOnly.join(', ')}`)
  }

  printReport(envId, rows, remoteMap)

  const toDeploy = all
    ? names
    : rows.filter((r) => r.status === 'changed' || r.status === 'local_only').map((r) => r.name)

  if (!toDeploy.length) {
    console.log('\n[push:cloud] 无需上传，本地与云端一致。')
    return
  }

  console.log(`\n[push:cloud] 待上传 (${toDeploy.length})：${toDeploy.join(', ')}`)

  if (!yes) {
    console.log('\n[push:cloud] 预览模式；确认上传请加 --yes')
    console.log('  例：npm run push:cloud -- --yes')
    return
  }

  let failed = null
  for (const name of toDeploy) {
    try {
      deployOne(name, envId)
      const hash = hashFunctionDir(localFunctionDir(name))
      if (hash) updateManifestEntry(envId, name, hash)
    } catch (err) {
      failed = name
      console.error(`[push:cloud] 失败：${name}`, err.message || err)
      break
    }
  }

  if (failed) {
    process.exit(1)
  }

  console.log('\n[push:cloud] 上传完成')
}

try {
  main()
} catch (err) {
  console.error('[push:cloud]', err.message || err)
  process.exit(1)
}
