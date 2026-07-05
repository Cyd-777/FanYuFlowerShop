/**
 * 将 template 内 text/view/button 的纯静态中文改为 script 常量 + {{ }}
 * 仅处理 <template>，跳过已含 {{ }} 的节点。
 */
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const SRC = path.join(__dirname, '../src')
const TAG_RE = /(<(text|view|button)\b[^>]*>)\s*([\u4e00-\u9fff][^<{]{0,200}?)\s*(<\/\2>)/g

const COMMON_NAMES = {
  '加载中…': 'loadingTipText',
  '加载中...': 'loadingTipText',
  '编辑': 'editText',
  '删除': 'deleteText',
  '取消': 'cancelText',
  '默认': 'defaultBadgeText',
  '或': 'orDividerText',
  '合计': 'totalLabelText',
  '备注': 'remarkLabelText',
  '商品': 'goodsLabelText',
  '花材': 'flowerMaterialLabelText',
  '包装': 'packagingLabelText',
  '贺卡': 'cardLabelText',
  '留言': 'messageLabelText',
  '身份': 'roleLabelText',
  '启用': 'enabledLabelText',
  '筛选': 'filterActionText',
  '上架': 'onShelfActionText',
  '下架': 'offShelfActionText',
  '新建': 'createActionText',
  '种类': 'kindLabelText',
  '标准': 'standardLabelText',
  '缩略': 'thumbLabelText',
  '最低': 'minPriceLabelText',
  '最高': 'maxPriceLabelText',
  '图标': 'iconLabelText',
  '主题色': 'themeColorLabelText',
  '使用中': 'inUseBadgeText',
  '核销记录': 'verifyHistoryTitleText',
}

function walkVue(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    const st = fs.statSync(full)
    if (st.isDirectory()) walkVue(full, acc)
    else if (name.endsWith('.vue')) acc.push(full)
  }
  return acc
}

function toConstName(text, used, fileIndex) {
  if (COMMON_NAMES[text]) {
    let name = COMMON_NAMES[text]
    if (!used.has(name)) {
      used.add(name)
      return name
    }
  }

  const digest = crypto.createHash('md5').update(text).digest('hex').slice(0, 6)
  let name = `uiText_${digest}`
  if (!used.has(name)) {
    used.add(name)
    return name
  }

  let i = 2
  while (used.has(`${name}_${i}`)) i += 1
  name = `${name}_${i}`
  used.add(name)
  return name
}

function escapeForJs(str) {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

function insertConstants(content, constantsBlock) {
  const setupMatch = content.match(/<script setup lang="ts">\n/)
  if (!setupMatch) return null

  const insertAt = setupMatch.index + setupMatch[0].length
  const afterSetup = content.slice(insertAt)

  const lines = afterSetup.split('\n')
  let importEndLine = 0
  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].trim()
    if (!trimmed || trimmed.startsWith('//')) continue
    if (trimmed.startsWith('import ')) {
      importEndLine = i + 1
      while (importEndLine < lines.length && !/ from ['"]/.test(lines[importEndLine - 1])) {
        importEndLine += 1
      }
      continue
    }
    break
  }

  const before = content.slice(0, insertAt) + lines.slice(0, importEndLine).join('\n')
  const after = lines.slice(importEndLine).join('\n')
  const sep = importEndLine > 0 && lines[importEndLine - 1] !== '' ? '\n' : ''
  return before + sep + constantsBlock + after
}

function processFile(file) {
  let content = fs.readFileSync(file, 'utf8')
  const templateMatch = content.match(/<template>([\s\S]*?)<\/template>/)
  if (!templateMatch) return { changed: false }

  const templateStart = templateMatch.index
  const templateBody = templateMatch[1]
  const used = new Set()
  const textToName = new Map()

  const newTemplate = templateBody.replace(TAG_RE, (full, open, tag, text, close) => {
    const trimmed = text.trim()
    if (!trimmed || trimmed.includes('{{')) return full

    if (!textToName.has(trimmed)) {
      textToName.set(trimmed, toConstName(trimmed, used, 0))
    }
    const name = textToName.get(trimmed)
    return `${open}{{ ${name} }}${close}`
  })

  if (newTemplate === templateBody) return { changed: false }

  const constantsLines = [...textToName.entries()]
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([text, name]) => `const ${name} = '${escapeForJs(text)}'`)

  const constantsBlock = `\n${constantsLines.join('\n')}\n`

  content =
    content.slice(0, templateStart) +
    '<template>' +
    newTemplate +
    '</template>' +
    content.slice(templateStart + templateMatch[0].length)

  const withConsts = insertConstants(content, constantsBlock)
  if (!withConsts) {
    console.warn('skip (no script setup):', path.relative(SRC, file))
    return { changed: false }
  }

  fs.writeFileSync(file, withConsts, 'utf8')
  return { changed: true, count: textToName.size }
}

function main() {
  let changedFiles = 0
  let totalConsts = 0
  for (const file of walkVue(SRC)) {
    const result = processFile(file)
    if (result.changed) {
      changedFiles += 1
      totalConsts += result.count
      console.log('ok', path.relative(SRC, file), result.count)
    }
  }
  console.log(`done: ${changedFiles} files, ${totalConsts} constants`)
}

main()
