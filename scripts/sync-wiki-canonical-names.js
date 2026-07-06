/**
 * 云库词条 / 商品品种名归并为 canonical（弃用「黄色郁金香」等旧通用品名）
 *
 * 用法：
 *   npm run sync:cloud && npm run push:cloud -- --only wiki --yes
 *   npm run sync:wiki-canonical-names
 */
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
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

function main() {
  const envId = readEnvId()
  const payload = JSON.stringify({ action: 'syncKindProfiles' })
  console.log(`[sync:wiki-canonical-names] env=${envId}`)
  console.log('[sync:wiki-canonical-names] 调用 wiki.syncKindProfiles（含 mergeFlowerCatalog 写回 canonical 品种名）')
  execSync(`tcb fn invoke wiki -e ${envId} -d '${payload}'`, {
    cwd: root,
    stdio: 'inherit',
  })
}

main()
