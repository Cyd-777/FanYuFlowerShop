/**
 * 智库语义词典 v1：顾客口语 → WikiIntent
 * 人工维护；与 src/data/wikiLexicon.ts 保持同步
 */

const WIKI_QUERY_STOPWORDS = [
  '是',
  '多少',
  '多久',
  '怎么',
  '如何',
  '什么',
  '吗',
  '呢',
  '的',
  '了',
  '有',
  '在',
  '能',
  '可以',
  '一般',
  '大约',
  '大概',
  '呀',
  '啊',
]

/** 按短语长度降序排列，匹配时长者优先 */
const INTENT_PHRASES = [
  {
    intent: 'vase_life',
    phrases: [
      '花期是多久',
      '花期多久',
      '能开多久',
      '能养几天',
      '可以养几天',
      '养几天',
      '开多久',
      '瓶插多久',
      '水养多久',
      '能养多久',
    ],
  },
  {
    intent: 'soil_bloom',
    phrases: ['自然花期', '土培花期', '几月开花', '什么时候开花', '开花季节'],
  },
  {
    intent: 'water_change',
    phrases: ['怎么换水', '如何换水', '换水频率', '多久换水', '几天换水'],
  },
  {
    intent: 'how_to_care',
    phrases: ['怎么养', '如何养护', '养护方法', '怎么养护', '如何养'],
  },
  {
    intent: 'trim',
    phrases: ['怎么修剪', '如何修剪', '怎么斜剪', '斜剪'],
  },
  {
    intent: 'environment',
    phrases: ['摆放环境', '放哪里', '怎么摆放', '避光'],
  },
  {
    intent: 'origin',
    phrases: ['哪里产的', '产地', '产自'],
  },
  {
    intent: 'meaning',
    phrases: ['花语', '寓意', '代表什么', '象征什么'],
  },
  {
    intent: 'occasions',
    phrases: ['适合什么场合', '适用场合', '送什么场合', '适合送给'],
  },
  {
    intent: 'features',
    phrases: ['有什么特点', '形态特征', '特征'],
  },
]

/** 「花期」歧义：默认瓶插；含下列词时改土培花期 */
const BLOOM_DISAMBIGUATION = {
  trigger: '花期',
  defaultIntent: 'vase_life',
  soilHints: ['土培', '自然', '地里', '种植', '盆栽', '地栽'],
  soilIntent: 'soil_bloom',
}

const INTENT_LABELS = {
  vase_life: '能开多久',
  soil_bloom: '自然花期',
  how_to_care: '怎么养',
  water_change: '怎么换水',
  trim: '怎么修剪',
  environment: '摆放环境',
  origin: '产地',
  features: '形态特征',
  meaning: '花语',
  occasions: '适用场合',
}

module.exports = {
  WIKI_QUERY_STOPWORDS,
  INTENT_PHRASES,
  BLOOM_DISAMBIGUATION,
  INTENT_LABELS,
}
