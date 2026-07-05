/**
 * 仅同步「玫瑰」分类养护词条到云库
 * 用法：npm run deploy:cloud -- --only wiki && npm run sync:wiki-rose-care
 */
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const envFile = path.join(root, 'src/config/env.ts')

function readEnvId() {
  if (process.env.CLOUD_ENV_ID?.trim()) return process.env.CLOUD_ENV_ID.trim()
  const source = fs.readFileSync(envFile, 'utf8')
  const match = source.match(/export const CLOUD_ENV_ID = ['"]([^'"]+)['"]/)
  if (!match?.[1]) throw new Error('未找到 CLOUD_ENV_ID')
  return match[1]
}

function main() {
  const envId = readEnvId()
  const payload = JSON.stringify({ action: 'syncRoseCare' })
  console.log(`[sync:wiki-rose-care] env=${envId}`)
  execSync(`tcb fn invoke wiki -e ${envId} -d '${payload}'`, {
    cwd: root,
    stdio: 'inherit',
  })
}

main()
