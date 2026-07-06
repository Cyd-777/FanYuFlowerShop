import type { WikiArticleEditForm } from '@/utils/wikiMerchantForm'

/** 笔记式编辑可写字段（含 picker 入口） */
export type WikiNoteEditTarget =
  | keyof WikiArticleEditForm
  | 'picker:taxonomy'
  | 'picker:group'
  | 'picker:regions'
  | 'picker:flowerForm'
  | 'picker:features'
  | 'picker:careBase'
  | 'picker:occasions'

export interface WikiNoteFieldMeta {
  label: string
  placeholder: string
  multiline: boolean
}

export const WIKI_NOTE_TEXT_FIELDS: Partial<Record<keyof WikiArticleEditForm, WikiNoteFieldMeta>> = {
  atlasIntroParagraphsText: {
    label: '介绍正文',
    placeholder: '品种背景、图鉴叙述；段与段之间空一行',
    multiline: true,
  },
  languageMeaning: {
    label: '核心花语',
    placeholder: '一句核心寓意',
    multiline: false,
  },
  languageParagraphsText: {
    label: '花语正文',
    placeholder: '送花语境、情感表达；段与段之间空一行',
    multiline: true,
  },
  languageCaution: {
    label: '送花注意',
    placeholder: '送花前需注意的事项',
    multiline: true,
  },
  careSummary: {
    label: '养护摘要',
    placeholder: '瓶插养护总述',
    multiline: true,
  },
  careWaterChange: {
    label: '换水',
    placeholder: '换水频次与做法',
    multiline: true,
  },
  careTrim: {
    label: '修剪',
    placeholder: '斜剪、修根说明',
    multiline: true,
  },
  careWaterDepth: {
    label: '水位',
    placeholder: '花瓶水位或浸没深度',
    multiline: true,
  },
  careTipsText: {
    label: '养护提示',
    placeholder: '每行一条；建议以「避免」「注意」「建议」开头',
    multiline: true,
  },
  bloomVase: {
    label: '瓶插天数',
    placeholder: '如：约 7—10 天',
    multiline: false,
  },
  bloomVaseNote: {
    label: '花期说明',
    placeholder: '季节、水位对花期的影响',
    multiline: true,
  },
  namingNote: {
    label: '命名说明',
    placeholder: '品种命名由来',
    multiline: true,
  },
}

export function isWikiNotePickerTarget(target: WikiNoteEditTarget): target is `picker:${string}` {
  return String(target).startsWith('picker:')
}

export function wikiNotePickerKey(target: WikiNoteEditTarget): string {
  return String(target).replace(/^picker:/, '')
}
