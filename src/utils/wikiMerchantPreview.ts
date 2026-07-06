import type { FlowerWiki, WikiCareVase } from '@/types/wiki'
import { normalizeFlowerWiki } from '@/types/wiki'
import { resolveCareVaseBlock, resolveTaxonomyBlock } from '@/utils/wikiBlockRegistry'
import {
  articleEditFormToWikiPayload,
  type WikiArticleEditForm,
} from '@/utils/wikiMerchantForm'

function mergeCareVasePreview(base: WikiCareVase, override: Partial<WikiCareVase>): WikiCareVase {
  return {
    ...base,
    ...override,
    tips: override.tips?.length ? override.tips : base.tips || [],
    wakeUp: override.wakeUp
      ? { ...(base.wakeUp || {}), ...override.wakeUp }
      : base.wakeUp,
    environment: override.environment ?? base.environment,
    emergency: override.emergency
      ? { ...(base.emergency || { title: '', steps: [] }), ...override.emergency }
      : base.emergency,
    commonIssues: override.commonIssues?.length ? override.commonIssues : base.commonIssues,
  }
}

/** 商家表单 → 顾客端详情预览用 FlowerWiki（不拉云、不走 overlay 覆盖） */
export function formToPreviewWiki(form: WikiArticleEditForm): FlowerWiki {
  const payload = articleEditFormToWikiPayload(form)
  const careBase = resolveCareVaseBlock(form.careBaseRef)
  const overrideCare: Partial<WikiCareVase> = {
    summary: payload.careVase.summary,
    waterChange: payload.careVase.waterChange,
    trim: payload.careVase.trim,
    trimPosition: payload.careVase.trimPosition || '',
    waterDepth: payload.careVase.waterDepth,
    additives: payload.careVase.additives,
    tips: payload.careVase.tips,
  }
  const careVase = careBase ? mergeCareVasePreview(careBase, overrideCare) : overrideCare

  const taxBlock = resolveTaxonomyBlock(form.taxonomyRef)

  return normalizeFlowerWiki({
    _id: 'merchant-preview',
    kindId: '',
    varietyId: '',
    kindName: payload.kindName,
    varietyName: payload.varietyName,
    icon: payload.icon,
    coverImage: '',
    plantForm: payload.plantForm,
    careBaseRef: payload.careBaseRef,
    bloom: payload.bloom,
    careVase: careVase as WikiCareVase,
    careSoil: {},
    atlas: payload.atlas,
    taxonomy: taxBlock
      ? {
          order: taxBlock.order || '',
          family: taxBlock.family || '',
          genus: taxBlock.genus || '',
        }
      : {},
    names: payload.names,
    careGuide: {},
    language: payload.language,
    keywords: payload.keywords,
    aliases: payload.aliases,
    tags: payload.tags,
    occasions: payload.occasions,
    seasonMonths: [],
    restockHints: [],
    searchText: '',
    searchVersion: 1,
    enabled: payload.enabled,
    sort: payload.sort,
  })
}
