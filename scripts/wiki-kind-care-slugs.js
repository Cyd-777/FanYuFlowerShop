/** 种类中文名 → care/taxonomy 块 slug（care.{slug}.vase_base） */
const KIND_CARE_SLUG = {
  玫瑰: 'rose',
  百合: 'lily',
  康乃馨: 'carnation',
  绣球: 'hydrangea',
  芍药: 'peony',
  洋桔梗: 'eustoma',
  郁金香: 'tulip',
  菊花: 'chrysanthemum',
  马蹄莲: 'calla',
  向日葵: 'sunflower',
  洋牡丹: 'ranunculus',
  银莲花: 'anemone',
  翠珠: 'greenbell',
  蕾丝花: 'laceflower',
  紫罗兰: 'violet',
  勿忘我: 'forget-me-not',
  满天星: 'gypsophila',
  风信子: 'hyacinth',
  配叶: 'foliage',
  盆栽: 'potted',
}

function careBlockId(kindName) {
  const slug = KIND_CARE_SLUG[kindName]
  return slug ? `care.${slug}.vase_base` : ''
}

function kindFilePrefix(kindName) {
  return KIND_CARE_SLUG[kindName] || 'kind'
}

module.exports = { KIND_CARE_SLUG, careBlockId, kindFilePrefix }
