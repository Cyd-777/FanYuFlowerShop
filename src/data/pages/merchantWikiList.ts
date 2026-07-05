import { useMerchantWikis } from '@/composables/useMerchantWikis'
import { navigateTo } from '@/utils/router'
import { computed } from 'vue'
import type { PageEnsureContext } from '../types'
import type { PageSetupResult } from '../pageRegistry'
import {
  buildWikiGroupedBrowseFlow,
  getWikiDisplayName,
  type FlowerWikiListItem,
} from '@/types/wiki'

export interface WikiNavSection {
  kindName: string
  icon: string
  kindEntryId?: string
  varieties: FlowerWikiListItem[]
}

export function setupMerchantWikiListPageData(): PageSetupResult & Record<string, unknown> {
  const { wikis, loading, loadWikis } = useMerchantWikis()

  async function ensure(ctx: PageEnsureContext) {
    await loadWikis({ force: ctx.force })
  }

  const wikiSections = computed<WikiNavSection[]>(() => {
    const grouped = buildWikiGroupedBrowseFlow(wikis.value, { forMerchant: true })
    return grouped.map((group) => {
      const kindEntry = group.items.find((item) => !String(item.varietyName || '').trim())
      const varieties = group.items.filter((item) => Boolean(String(item.varietyName || '').trim()))
      return {
        kindName: group.kindName,
        icon: group.icon,
        kindEntryId: kindEntry?._id,
        varieties,
      }
    })
  })

  function editWiki(id: string) {
    navigateTo({ url: `/pagesMerchant/wiki/edit?id=${id}` })
  }

  function addVariety(kindName: string, icon: string) {
    navigateTo({
      url: `/pagesMerchant/wiki/edit?kindName=${encodeURIComponent(kindName)}&icon=${encodeURIComponent(icon)}`,
    })
  }

  function addKind() {
    navigateTo({ url: '/pagesMerchant/wiki/edit' })
  }

  function displayVarietyName(item: FlowerWikiListItem) {
    return getWikiDisplayName(item)
  }

  return {
    ensure,
    refreshOnShow: true,
    pullDownRefresh: false,
    wikis,
    wikiSections,
    loading,
    editWiki,
    addVariety,
    addKind,
    displayVarietyName,
  }
}
