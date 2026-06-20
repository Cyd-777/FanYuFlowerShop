import { ref } from 'vue'
import { navigateTo } from '@/utils/router'
import { useGoodsLiveSync } from '@/composables/useGoodsLiveSync'
import { goodsLiveSync } from '@/services/goodsLiveSync'
import { goodsRepository, wikiRepository } from '@/data/repository'
import { goodsPublicDetailKey } from '@/data/cacheKeys'
import { hasCacheEntry } from '@/utils/cache'
import { resolveCloudImageMap, pickPublicImageUrls } from '@/utils/goodsImage'
import type { Goods } from '@/types/goods'
import type { FlowerWiki } from '@/types/wiki'
import { getWikiDisplayName } from '@/types/wiki'
import type { PageEnsureContext } from '../types'
import type { PageSetupResult } from '../pageRegistry'

const EMPTY_GOODS: Goods = {
  _id: '',
  name: '',
  price: 0,
  unit: '束',
  stock: 0,
  description: '',
  categoryId: '',
  categoryName: '',
  coverImage: '',
  images: [],
  onSale: true,
  recommend: false,
  sort: 0,
}

export function setupGoodsDetailPageData(): PageSetupResult & Record<string, unknown> {
  const wikiCardTitle = '查看花卉百科'
  const wikiCardDesc = '图鉴 · 养殖指南 · 花语百科'

  const goods = ref<Goods>({ ...EMPTY_GOODS })
  const images = ref<string[]>([])
  const imageFileIds = ref<string[]>([])
  const goodsId = ref('')
  const loading = ref(false)
  const wikiEntry = ref<FlowerWiki | null>(null)

  function onLoad(query: Record<string, string | undefined>) {
    goodsId.value = query.id || ''
  }

  async function applyGoodsImages(data: Goods) {
    const fileIds = data.images.length
      ? data.images
      : data.coverImage
        ? [data.coverImage]
        : []
    imageFileIds.value = fileIds

    const publicUrls = pickPublicImageUrls(data)
    if (publicUrls.length) {
      images.value = publicUrls
      return
    }

    const imageMap = await resolveCloudImageMap(fileIds)
    images.value = fileIds.length
      ? fileIds.map((fileId) => imageMap.get(fileId) || (/^https?:\/\//.test(fileId) ? fileId : ''))
      : []
  }

  async function loadMatchedWiki() {
    if (!goods.value.flowerKindId && !goods.value.flowerVarietyId) {
      wikiEntry.value = null
      return
    }

    try {
      const { data } = await wikiRepository.ensureMatch(
        goods.value.flowerKindId || '',
        goods.value.flowerVarietyId || '',
        { onUpdate: (wiki) => { wikiEntry.value = wiki } },
      )
      wikiEntry.value = data
    } catch {
      wikiEntry.value = null
    }
  }

  async function loadGoods(force = false) {
    if (!goodsId.value) return
    loading.value = force ? true : !hasCacheEntry(goodsPublicDetailKey(goodsId.value))
    try {
      const { data } = await goodsRepository.ensurePublicDetail(goodsId.value, {
        force,
        onUpdate: async (updated) => {
          goods.value = updated
          await applyGoodsImages(updated)
          await loadMatchedWiki()
        },
      })
      goods.value = data
      await applyGoodsImages(data)
      await loadMatchedWiki()
    } catch (err) {
      wx.showToast({
        title: err instanceof Error ? err.message : '加载失败',
        icon: 'none',
      })
    } finally {
      loading.value = false
    }
  }

  async function ensure(ctx: PageEnsureContext) {
    if (!goodsId.value) return
    await loadGoods(!!ctx.force)
    goodsLiveSync.resetVersionBaseline()
  }

  useGoodsLiveSync({
    getTargetIds: () => (goodsId.value ? [goodsId.value] : []),
    applyPatches: async ({ patches, missingIds }) => {
      if (missingIds.includes(goodsId.value)) {
        goods.value = { ...goods.value, onSale: false, stock: 0 }
        return
      }
      const patch = patches.find((item) => item._id === goodsId.value)
      if (!patch) return
      goods.value = patch
      await applyGoodsImages(patch)
    },
  })

  function formatPrice(price: number) {
    return Number(price).toFixed(2).replace(/\.00$/, '')
  }

  function goWiki() {
    if (!wikiEntry.value) return
    const name = getWikiDisplayName(wikiEntry.value)
    navigateTo({
      url: `/pagesCustomer/wiki/detail?id=${wikiEntry.value._id}&tab=atlas&from=goods&name=${encodeURIComponent(name)}`,
    })
  }

  return {
    ensure,
    onLoad,
    refreshOnShow: false,
    pullDownRefresh: false,
    wikiCardTitle,
    wikiCardDesc,
    goods,
    images,
    imageFileIds,
    goodsId,
    loading,
    wikiEntry,
    formatPrice,
    goWiki,
  }
}
