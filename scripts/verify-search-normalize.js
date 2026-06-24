#!/usr/bin/env node
/** 本地校验 searchQueryNormalize（无需 jest） */
const {
  normalizeSearchQueryText,
  parseChineseNumeral,
  normalizeChineseNumeralsInText,
} = require('../dist/utils/searchQueryNormalize.js')

const cases = [
  ['一百到两百', '100到200'],
  ['低于壹佰元', '低于100元'],
  ['50到贰佰之间', '50到200之间'],
  ['价格在一百至两百块', '价格在100至200块'],
  ['百合', '百合'],
  ['推荐商品', '推荐商品'],
  ['１００到２００', '100到200'],
]

let failed = 0
for (const [input, expected] of cases) {
  const out = normalizeSearchQueryText(input)
  if (out !== expected) {
    console.error(`FAIL: "${input}" → "${out}" (expected "${expected}")`)
    failed += 1
  } else {
    console.log(`OK: ${input}`)
  }
}

const numerals = [
  ['一百', 100],
  ['壹佰', 100],
  ['贰拾', 20],
  ['十', 10],
]
for (const [input, expected] of numerals) {
  const n = parseChineseNumeral(input)
  if (n !== expected) {
    console.error(`FAIL parse: ${input} → ${n} (expected ${expected})`)
    failed += 1
  }
}

process.exit(failed ? 1 : 0)
