/**
 * 将品类 profile 批量写回云库 flower_wiki（修正错误正文、补全缺失词条）
 *
 * 用法：
 *   npm run sync:cloud && npm run deploy:cloud -- --only wiki
 *   npm run sync:wiki-profiles
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
  console.log(`[sync:wiki-profiles] env=${envId}`)
  execSync(`tcb fn invoke wiki -e ${envId} -d '${payload}'`, {
    cwd: root,
    stdio: 'inherit',
  })
}

main()
