import { showToast } from '@/utils/feedback'
import { computed, ref } from 'vue'
import { hasCacheEntry } from '@/utils/cache'
import { buildFlowerLabel } from '@/services/flower'
import { ensureFlowerCatalog } from '@/modules/flower'
import { wikiRepository } from '@/data/repository/wikiRepository'
import { CACHE_KEYS } from '@/data/cacheKeys'
import { navigateBack } from '@/utils/router'
import { buildFlowerCatalogFromWiki } from '@/utils/wikiFlowerCatalog'
import type { FlowerKindWithVarieties } from '@/types/flower'
import { FLOWER_PICK_STORAGE_KEY } from '@/types/flower'
import type { PageEnsureContext } from '../types'
import type { PageSetupResult } from '../pageRegistry'

export function setupFlowerPickerPageData(): PageSetupResult & Record<string, unknown> {
  const cloudSourceLabel = '数据来源：智库 flower_wiki（与百科 Tab 同步）'
  const searchPlaceholder = '搜索品类或品种，如 红玫瑰、黄天霸'
  const emptyVarietyText = '该品类在智库中暂无子品种词条'
  const emptyCatalogText = '智库花卉库为空，请先维护 flower_wiki'
  const confirmText = '确认选择'

  const loading = ref(false)
  const keyword = ref('')
  const catalog = ref<FlowerKindWithVarieties[]>([])
  const presetKindId = ref('')
  const presetVarietyId = ref('')
  const activeKindId = ref('')
  const selectedVarietyId = ref('')

  const activeKind = computed(() => catalog.value.find((item) => item._id === activeKindId.value))
  const activeVarieties = computed(() => activeKind.value?.varieties || [])
  const totalVarietyCount = computed(() =>
    catalog.value.reduce((sum, item) => sum + item.varieties.length, 0),
  )
  const cloudStatsText = computed(() => {
    return `已加载 ${catalog.value.length} 个品类 · ${totalVarietyCount.value} 个品种`
  })
  const canConfirm = computed(() => !!activeKindId.value && !!selectedVarietyId.value)
  const selectedLabel = computed(() => {
    if (!activeKind.value || !selectedVarietyId.value) return ''
    const variety = activeVarieties.value.find((item) => item._id === selectedVarietyId.value)
    if (!variety) return ''
    return buildFlowerLabel(activeKind.value.name, variety.name)
  })

  function onLoad(query: Record<string, string | undefined>) {
    presetKindId.value = query.kindId || ''
    presetVarietyId.value = query.varietyId || ''
  }

  function syncSelectionAfterCatalogLoad(list: FlowerKindWithVarieties[]) {
    if (!list.length) {
      activeKindId.value = ''
      selectedVarietyId.value = ''
      return
    }

    if (presetKindId.value && list.some((item) => item._id === presetKindId.value)) {
      activeKindId.value = presetKindId.value
    } else if (!list.some((item) => item._id === activeKindId.value)) {
      activeKindId.value = list[0]._id
    }

    if (
      presetVarietyId.value &&
      activeVarieties.value.some((item) => item._id === presetVarietyId.value)
    ) {
      selectedVarietyId.value = presetVarietyId.value
    } else {
      ensureSelectedVariety()
    }
  }

  async function loadCatalog(force = false) {
    const isSearch = !!keyword.value.trim()
    loading.value = isSearch ? true : !hasCacheEntry(CACHE_KEYS.wikiList)
    try {
      if (isSearch) {
        const wikiList = await wikiRepository.searchPublicList(keyword.value.trim())
        catalog.value = buildFlowerCatalogFromWiki(wikiList)
      } else {
        const { data } = await ensureFlowerCatalog({
          force,
          onUpdate: (updated) => {
            catalog.value = updated
            syncSelectionAfterCatalogLoad(updated)
          },
        })
        catalog.value = data
      }
      syncSelectionAfterCatalogLoad(catalog.value)
    } catch (err) {
      showToast({
        title: err instanceof Error ? err.message : '加载智库花卉库失败',
        icon: 'none',
        duration: 3000,
      })
    } finally {
      loading.value = false
    }
  }

  async function ensure(ctx: PageEnsureContext) {
    await loadCatalog(ctx.force)
  }

  function selectKind(kindId: string) {
    activeKindId.value = kindId
    selectedVarietyId.value = ''
    ensureSelectedVariety()
  }

  function selectVariety(varietyId: string) {
    selectedVarietyId.value = varietyId
  }

  function ensureSelectedVariety() {
    const varieties = activeVarieties.value
    if (!varieties.length) {
      selectedVarietyId.value = ''
      return
    }
    if (!varieties.some((item) => item._id === selectedVarietyId.value)) {
      selectedVarietyId.value = varieties[0]._id
    }
  }

  async function handleSearch() {
    await loadCatalog()
  }

  function confirmPick() {
    const kind = activeKind.value
    const variety = activeVarieties.value.find((item) => item._id === selectedVarietyId.value)
    if (!kind || !variety) return

    const unit = variety.defaultUnit || kind.defaultUnit || '束'
    const description = [variety.description, kind.description].filter(Boolean).join('\n')

    wx.setStorageSync(FLOWER_PICK_STORAGE_KEY, {
      name: variety.name,
      unit,
      description,
      flowerKindId: kind._id,
      flowerKindName: kind.name,
      flowerVarietyId: variety._id,
      flowerVarietyName: variety.name,
      pickedAt: Date.now(),
    })

    navigateBack()
  }

  return {
    ensure,
    onLoad,
    refreshOnShow: true,
    pullDownRefresh: false,
    cloudSourceLabel,
    searchPlaceholder,
    emptyVarietyText,
    emptyCatalogText,
    confirmText,
    loading,
    keyword,
    catalog,
    activeKindId,
    selectedVarietyId,
    activeKind,
    activeVarieties,
    cloudStatsText,
    canConfirm,
    selectedLabel,
    loadCatalog,
    selectKind,
    selectVariety,
    handleSearch,
    confirmPick,
  }
}
