/**
 * 审计云库 flower_wiki 内容概况（只读）
 * 用法：node scripts/audit-wiki-db.js
 */
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const envFile = path.join(root, 'src/config/env.ts')

function readEnvId() {
  const source = fs.readFileSync(envFile, 'utf8')
  const match = source.match(/export const CLOUD_ENV_ID = ['"]([^'"]+)['"]/)
  if (!match?.[1]) throw new Error('未找到 CLOUD_ENV_ID')
  return match[1]
}

function dbCount(envId, query) {
  const command = JSON.stringify([
    {
      TableName: 'flower_wiki',
      CommandType: 'COMMAND',
      Command: JSON.stringify({ count: 'flower_wiki', query }),
    },
  ])
  const out = execSync(`tcb db nosql execute -e ${envId} --json --command '${command}'`, {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  const parsed = JSON.parse(out)
  const n = parsed.data.results[0][0].n
  return typeof n === 'object' ? Number(n.$numberInt ?? n) : Number(n)
}

function dbFindSample(envId, filter, limit = 3) {
  const command = JSON.stringify([
    {
      TableName: 'flower_wiki',
      CommandType: 'QUERY',
      Command: JSON.stringify({
        find: 'flower_wiki',
        filter,
        projection: {
          kindName: 1,
          varietyName: 1,
          profileSyncVersion: 1,
          'atlas.paragraphs': 1,
          'atlas.summary': 1,
          'language.paragraphs': 1,
          'careVase.wakeUp': 1,
          tags: 1,
        },
        limit,
      }),
    },
  ])
  const out = execSync(`tcb db nosql execute -e ${envId} --json --command '${command}'`, {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  return JSON.parse(out).data.results[0]
}

function main() {
  const envId = readEnvId()
  console.log(`[audit-wiki-db] env=${envId}`)

  const stats = {
    total: dbCount(envId, {}),
    enabled: dbCount(envId, { enabled: true }),
    profileSyncV2: dbCount(envId, { profileSyncVersion: 2 }),
    profileSyncV3: dbCount(envId, { profileSyncVersion: { $gte: 3 } }),
    hasAtlasParagraphs: dbCount(envId, {
      'atlas.paragraphs': { $exists: true, $not: { $size: 0 } },
    }),
    hasLanguageParagraphs: dbCount(envId, {
      'language.paragraphs': { $exists: true, $not: { $size: 0 } },
    }),
    hasWakeUp: dbCount(envId, { 'careVase.wakeUp': { $exists: true } }),
    hasTags: dbCount(envId, { tags: { $exists: true, $not: { $size: 0 } } }),
    kindOnly: dbCount(envId, { varietyName: '' }),
    withVariety: dbCount(envId, { varietyName: { $ne: '' } }),
  }

  console.log('\n=== flower_wiki 统计 ===')
  console.log(JSON.stringify(stats, null, 2))

  console.log('\n=== 弗洛伊德样本（库内 raw）===')
  console.log(
    JSON.stringify(
      dbFindSample(envId, { kindName: '玫瑰', varietyName: '弗洛伊德' }, 5),
      null,
      2,
    ),
  )
}

main()
