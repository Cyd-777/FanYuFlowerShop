/**
 * iNaturalist 图片批量下载脚本
 *
 * 从项目品种数据中自动读取品种列表，搜索 iNaturalist API 下载图片。
 *
 * 用法：
 *   node scripts/download-inaturalist-images.js
 *
 * 输出目录：download/inaturalist/
 *   每个品种一个子目录，图片命名：{序号}_{photoId}.jpg
 *   根目录生成 download-report.json 包含所有下载记录和署名信息
 *
 * 署名要求：
 *   所有图片均来自 iNaturalist Open Dataset（CC 许可）。
 *   使用图片时须标注：© {摄影师名}, some rights reserved ({许可证})
 *   CC0 图片标注：{摄影师名}, no rights reserved (CC0)
 */

const fs = require('fs')
const path = require('path')
const https = require('https')
const http = require('http')

// ---- 配置 ----

const ROOT = path.join(__dirname, '..')
const VARIETIES_DIR = path.join(ROOT, 'src', 'data', 'wiki', 'varieties')
const OUTPUT_DIR = path.join(ROOT, 'download', 'inaturalist')
const REPORT_PATH = path.join(OUTPUT_DIR, 'download-report.json')

const MAX_IMAGES_PER_SPECIES = 10
const API_DELAY_MS = 1500  // iNat API 限速 ~1 req/s
const DOWNLOAD_TIMEOUT = 20000

// 种类英文 → 中文对照（用以修正文件名）
const KIND_LABELS = {
  rose: '玫瑰',
  lily: '百合',
  carnation: '康乃馨',
  hydrangea: '绣球',
  peony: '牡丹',
  eustoma: '洋桔梗',
  tulip: '郁金香',
  chrysanthemum: '菊花',
  sunflower: '向日葵',
  gypsophila: '满天星',
  forget_me_not: '勿忘我',
  calla: '马蹄莲',
  anemone: '银莲花',
  ranunculus: '花毛茛',
  violet: '紫罗兰',
  laceflower: '蕾丝花',
  greenbell: '绿铃草',
  hyacinth: '风信子',
  foliage: '配叶',
  potted: '盆栽',
}

/** 种类回退搜索词：品种级搜不到时，用属/种级名称搜索 */
const KIND_FALLBACK_SEARCH = {
  rose: 'Rosa',
  lily: 'Lilium',
  carnation: 'Dianthus caryophyllus',
  hydrangea: 'Hydrangea',
  peony: 'Paeonia',
  eustoma: 'Eustoma grandiflorum',
  tulip: 'Tulipa',
  chrysanthemum: 'Chrysanthemum',
  sunflower: 'Helianthus annuus',
  gypsophila: 'Gypsophila',
  forget_me_not: 'Myosotis',
  calla: 'Zantedeschia',
  anemone: 'Anemone',
  ranunculus: 'Ranunculus',
  violet: 'Matthiola',
  laceflower: 'Orlaya grandiflora',
  greenbell: 'Trachelium caeruleum',
  hyacinth: 'Hyacinthus orientalis',
  foliage: 'foliage',
  potted: 'potted',
}

// ============================================================
//  工具函数
// ============================================================

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http
    const req = mod.get(url, { timeout: 15000 }, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}`))
        } else {
          try { resolve(JSON.parse(data)) }
          catch { resolve(data) }
        }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')) })
  })
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath)
    const mod = url.startsWith('https') ? https : http
    const req = mod.get(url, { timeout: DOWNLOAD_TIMEOUT }, (res) => {
      if (res.statusCode >= 400) {
        file.close(); fs.unlinkSync(destPath)
        reject(new Error(`HTTP ${res.statusCode}`)); return
      }
      res.pipe(file)
      file.on('finish', () => { file.close(); resolve(destPath) })
    })
    req.on('error', (err) => { file.close(); try { fs.unlinkSync(destPath) } catch {}; reject(err) })
    req.on('timeout', () => { req.destroy(); file.close(); try { fs.unlinkSync(destPath) } catch {}; reject(new Error('Timeout')) })
  })
}

// ============================================================
//  读取品种清单
// ============================================================

function loadSpeciesList() {
  const files = fs.readdirSync(VARIETIES_DIR).filter((f) => f.endsWith('.json'))
  const species = []

  for (const file of files) {
    const filePath = path.join(VARIETIES_DIR, file)
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
      const parts = file.replace('.json', '').split('-')
      const kindEn = parts[0]
      const varietyEn = parts.slice(1).join('-')
      const kindCn = KIND_LABELS[kindEn] || kindEn
      const searchName = data.names?.scientificName || ''

      species.push({
        kindCn,
        varietyEn,
        label: varietyEn ? `${kindCn} · ${varietyEn}` : kindCn,
        searchName,
        scientificName: data.names?.scientificName || '',
        commonNames: data.names?.commonNames || [],
        file,
      })
    } catch (err) {
      console.warn(`  ⚠️  读取失败: ${file} - ${err.message}`)
    }
  }

  return species
}

// ============================================================
//  iNaturalist API 调用
// ============================================================

/**
 * 搜索观察记录
 * 优先用学名（scientificName），回退用品种名
 */
async function searchObservations(searchName) {
  const url = `https://api.inaturalist.org/v1/observations?` +
    `taxon_name=${encodeURIComponent(searchName)}` +
    `&research_grade=yes` +
    `&geo=true` +
    `&photos=true` +
    `&locale=zh-CN` +
    `&per_page=${MAX_IMAGES_PER_SPECIES}` +
    `&order_by=votes`

  const data = await httpsGet(url)
  return data.results || []
}

/** 从 observation 中提取图片信息 */
function extractPhotos(observation) {
  const photos = []
  for (const photo of observation.photos || []) {
    // iNaturalist Open Dataset S3 直链
    const photoId = photo.id
    const url = `https://inaturalist-open-data.s3.amazonaws.com/photos/${photoId}/medium.jpg`
    const user = observation.user || {}

    photos.push({
      photoId,
      url,
      license: photo.license_code || 'CC0',
      attribution: photo.attribution || '',
      observerName: user.name || user.login || 'unknown',
      observerLogin: user.login || '',
    })
  }
  return photos
}

/** 统计已有图片数（按文件名前缀匹配） */
function countExistingByPrefix(prefix) {
  if (!fs.existsSync(OUTPUT_DIR)) return 0
  return fs.readdirSync(OUTPUT_DIR).filter((f) => f.startsWith(prefix) && /\.jpg$/i.test(f)).length
}

function createSkippedResult(species, existingImages) {
  return {
    species: species.label,
    kind: species.kindCn,
    variety: species.varietyEn,
    status: 'skipped',
    totalFound: existingImages,
    downloaded: existingImages,
    photos: [],
  }
}

// ============================================================
//  处理单个品种
// ============================================================

async function processSpecies(species, index, total) {
  const primaryName = species.scientificName || species.commonNames[0] || species.label
  const kindPrefix = species.file.split('-')[0]
  const fallbackName = (kindPrefix === 'foliage' || kindPrefix === 'potted')
    ? ''
    : (KIND_FALLBACK_SEARCH[kindPrefix] || '')

  // 文件名前缀 = 种类_品种（用于去重和搜索）
  const filePrefix = sanitizeName(species.kindCn) + '_' + sanitizeName(species.varietyEn || species.kindCn)

  // 跳过已有图片的品种
  const existingImages = countExistingByPrefix(filePrefix)
  if (existingImages >= MAX_IMAGES_PER_SPECIES) {
    console.log(`[${index}/${total}] ${species.label} — 已有 ${existingImages} 张，跳过`)
    return createSkippedResult(species, existingImages)
  }

  console.log(`[${index}/${total}] ${species.label}`)

  // 第 1 轮：用品种级学名搜索
  let observations = await trySearch(primaryName)
  let usedSearchName = primaryName

  // 第 2 轮：无结果且品种有英文名 → 用英文常见名再试
  if (!observations.length && species.commonNames.length > 0) {
    const engName = species.commonNames.find((n) => /^[a-z]/i.test(n))
    if (engName && engName !== primaryName) {
      console.log(`  回退搜索(英文): ${engName}`)
      observations = await trySearch(engName)
      usedSearchName = engName
    }
  }

  // 第 3 轮：仍无结果 → 用属级学名回退
  if (!observations.length && fallbackName && fallbackName !== primaryName) {
    console.log(`  回退搜索(属级): ${fallbackName}`)
    observations = await trySearch(fallbackName)
    usedSearchName = fallbackName
  }

  if (!observations.length) {
    console.warn(`  ⚠️  无结果`)
    return createResult(species, 'no_results')
  }

  let allPhotos = []
  for (const obs of observations) {
    allPhotos = allPhotos.concat(extractPhotos(obs))
  }
  allPhotos = allPhotos.slice(0, MAX_IMAGES_PER_SPECIES)

  console.log(`  找到 ${allPhotos.length} 张，开始下载 (搜索词: ${usedSearchName})...`)

  const downloaded = []
  for (let i = 0; i < allPhotos.length; i++) {
    const photo = allPhotos[i]
    const fileName = `${filePrefix}_${String(i + 1).padStart(2, '0')}_${photo.photoId}.jpg`
    const filePath = path.join(OUTPUT_DIR, fileName)

    try {
      await downloadFile(photo.url, filePath)
      downloaded.push({
        fileName,
        photoId: photo.photoId,
        license: photo.license,
        observerName: photo.observerName,
        observerLogin: photo.observerLogin,
        localPath: fileName,
      })
      process.stdout.write(`  ✓ ${fileName}\n`)
    } catch (err) {
      process.stdout.write(`  ✗ ${fileName} (${err.message})\n`)
    }
  }

  console.log(`  完成: ${downloaded.length}/${allPhotos.length} 张\n`)

  await sleep(API_DELAY_MS)

  return {
    species: species.label,
    kind: species.kindCn,
    variety: species.varietyEn,
    searchName: usedSearchName,
    primaryName,
    fallbackName,
    status: 'done',
    totalFound: allPhotos.length,
    downloaded: downloaded.length,
    photos: downloaded,
  }
}

async function trySearch(searchName) {
  if (!searchName) return []
  try {
    console.log(`  搜索: ${searchName}`)
    return await searchObservations(searchName)
  } catch (err) {
    console.warn(`  ⚠️  搜索失败: ${err.message}`)
    return []
  }
}

function createResult(species, status, errorMsg) {
  return {
    species: species.label,
    kind: species.kindCn,
    variety: species.varietyEn,
    searchName: species.scientificName || species.label,
    status,
    error: errorMsg,
    totalFound: 0,
    downloaded: 0,
    photos: [],
  }
}

function sanitizeName(name) {
  return name.replace(/[<>:"/\\|?*·\s]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
}

// ============================================================
//  入口
// ============================================================

async function main() {
  console.log('=== iNaturalist 图片批量下载 ===\n')

  const speciesList = loadSpeciesList()
  console.log(`品种文件数: ${speciesList.length}`)
  console.log(`输出目录: ${OUTPUT_DIR}`)
  console.log(`每品种上限: ${MAX_IMAGES_PER_SPECIES} 张\n`)

  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  const report = {
    startedAt: new Date().toISOString(),
    totalSpecies: speciesList.length,
    results: [],
  }

  for (let i = 0; i < speciesList.length; i++) {
    const result = await processSpecies(speciesList[i], i + 1, speciesList.length)
    report.results.push(result)
  }

  report.finishedAt = new Date().toISOString()

  const totalDownloaded = report.results.reduce((s, r) => s + (r.downloaded || 0), 0)
  const totalFound = report.results.reduce((s, r) => s + (r.totalFound || 0), 0)
  const failed = report.results.filter((r) => r.status !== 'done' && r.status !== 'skipped')
  const skipped = report.results.filter((r) => r.status === 'skipped').length
  const noResults = report.results.filter((r) => r.status === 'no_results').length

  report.summary = {
    totalDownloaded,
    totalFound,
    skipped,
    noResults,
    failed: failed.length,
    failedSpecies: failed.map((r) => `${r.species} (${r.error || 'no_results'})`),
  }

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8')

  console.log(`\n=== 完成 ===`)
  console.log(`  成功下载: ${totalDownloaded} 张（本次新增）`)
  console.log(`  已跳过（已有图片）: ${skipped} 个品种`)
  if (noResults) console.log(`  无结果品种: ${noResults} 个`)
  if (failed.length) console.log(`  搜索失败: ${failed.length} 个`)
  console.log(`\n下载目录: ${OUTPUT_DIR}`)
  console.log(`下载报告: ${REPORT_PATH}`)
}

main().catch((err) => {
  console.error('脚本异常:', err)
  process.exit(1)
})
