/**
 * 删除分包 sub-common 中未被任何页面 require/@import 引用的 chunk。
 * Taro 在顾客/商家分包共用组件时，可能额外复制 template/style 分块，但页面实际引用的是另一组 hash。
 */
const fs = require('fs')
const path = require('path')

const DIST = path.join(__dirname, '../dist')
const SUBPACKAGES = ['pagesCustomer', 'pagesMerchant']
const PAGE_EXT = /\.(js|wxss|json|wxml)$/

function collectPageText(pkgRoot) {
  const chunks = []

  function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name)
      const st = fs.statSync(full)
      if (st.isDirectory()) {
        if (name === 'sub-common') continue
        walk(full)
      } else if (PAGE_EXT.test(name)) {
        chunks.push(fs.readFileSync(full, 'utf8'))
      }
    }
  }

  walk(pkgRoot)
  return chunks.join('\n')
}

function pruneSubCommon() {
  if (!fs.existsSync(DIST)) {
    console.warn('[prune-sub-common] dist/ 不存在，跳过')
    return
  }

  let removed = 0
  let kept = 0

  for (const pkg of SUBPACKAGES) {
    const pkgRoot = path.join(DIST, pkg)
    const subDir = path.join(pkgRoot, 'sub-common')
    if (!fs.existsSync(subDir)) continue

    const pageText = collectPageText(pkgRoot)
    for (const name of fs.readdirSync(subDir)) {
      const hash = name.replace(/\.(js|wxss)$/, '')
      if (!hash) continue

      if (pageText.includes(hash)) {
        kept += 1
        continue
      }

      fs.unlinkSync(path.join(subDir, name))
      removed += 1
    }
  }

  console.log(`[prune-sub-common] 保留 ${kept} 个 chunk，删除 ${removed} 个无引用 chunk`)
}

pruneSubCommon()
