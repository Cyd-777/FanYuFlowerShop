import { showToast } from '@/utils/feedback'
import { ref } from 'vue'
import Taro, { useRouter } from '@tarojs/taro'
import { navigateTo } from '@/utils/router'
import { useGoodsLiveSync } from '@/composables/useGoodsLiveSync'
import { goodsLiveSync } from '@/services/goodsLiveSync'
import { goodsRepository, wikiRepository } from '@/data/repository'
import { goodsPublicDetailKey } from '@/data/cacheKeys'
import { hasCacheEntry, readCacheEntry } from '@/utils/cache'
import {
  isCloudFileId,
  pickCoverFileId,
  resolveCloudImageMap,
  attachGoodsCoverImages,
} from '@/utils/goodsImage'
import { hasGoodsLiveDiff, mergeGoodsLivePatch } from '@/utils/goodsLiveMerge'
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

function collectImageFileIds(data: Goods) {
  if (data.images?.length) return data.images.filter(Boolean)
  if (data.coverImage) return [data.coverImage]
  return []
}

function buildPreviewDisplayUrls(
  data: Goods,
  fileIds: string[],
  options?: { coverPreview?: string; previous?: string[] },
) {
  const coverPreview = options?.coverPreview?.trim() || ''
  return fileIds.map((fileId, index) => {
    // 第一张图优先用导航参数中来自列表的小图（0延迟，不白）
    if (index === 0 && coverPreview) return coverPreview
    // 其次云函数返回的商品自带链接
    const fromData = index === 0 ? data.coverImageUrl : data.imageUrls?.[index]
    if (fromData) return fromData
    return options?.previous?.[index] || fileId
  })
}

export function setupGoodsDetailPageData(): PageSetupResult & Record<string, unknown> {
  const wikiSectionTitle = '花卉百科'

  const goods = ref<Goods>({ ...EMPTY_GOODS })
  /** 传给 GoodsImage 的 preview 档 URL（非 full） */
  const images = ref<string[]>([])
  const imageFileIds = ref<string[]>([])
  const goodsId = ref('')
  const coverPreviewFromNav = ref('')
  const coverFileIdFromNav = ref('')
  const loading = ref(false)

  // setup 阶段同步读路由参数，让第一帧渲染就能显示小图（不白）
  const routeParams = useRouter().params as Record<string, string | undefined> | undefined
  const qPreview = routeParams?.coverPreview
    ? decodeURIComponent(routeParams.coverPreview)
    : ''
  const qFileId = routeParams?.coverFileId
    ? decodeURIComponent(routeParams.coverFileId)
    : ''
  if (qPreview) {
    images.value = [qPreview]
    imageFileIds.value = [qFileId || '']
    coverPreviewFromNav.value = qPreview
    coverFileIdFromNav.value = qFileId || ''
  }
  const wikiEntry = ref<FlowerWiki | null>(null)

  function syncImageSlots(data: Goods, coverPreview?: string) {
    const fileIds = collectImageFileIds(data)
    imageFileIds.value = fileIds
    images.value = buildPreviewDisplayUrls(data, fileIds, {
      coverPreview: coverPreview ?? coverPreviewFromNav.value,
      previous: images.value,
    })
  }

  function hydrateDetailFromCache(id: string) {
    if (!id) return
    const cached = readCacheEntry<Goods>(goodsPublicDetailKey(id))
    if (!cached?.data) return
    goods.value = cached.data
    syncImageSlots(cached.data)
  }

  function applyNavHeroPreview() {
    const preview = coverPreviewFromNav.value.trim()
    if (!preview) return

    const fileId = coverFileIdFromNav.value.trim()
      || pickCoverFileId(goods.value)
      || (isCloudFileId(preview) ? preview : '')

    if (fileId && isCloudFileId(fileId)) {
      if (!imageFileIds.value.length) imageFileIds.value = [fileId]
      images.value = buildPreviewDisplayUrls(goods.value, imageFileIds.value, { coverPreview: preview })
      return
    }

    if (!imageFileIds.value.length) imageFileIds.value = ['']
    images.value = [preview]
  }

  function onLoad(query: Record<string, string | undefined>) {
    goodsId.value = query.id || ''

    // 路由参数在 setup 已读（第一帧渲染），onLoad 再补一次确保覆盖
    if (query.coverPreview) {
      coverPreviewFromNav.value = decodeURIComponent(query.coverPreview)
    }
    if (query.coverFileId) {
      coverFileIdFromNav.value = decodeURIComponent(query.coverFileId)
    }

    hydrateDetailFromCache(goodsId.value)
    applyNavHeroPreview()
    if (imageFileIds.value.length) {
      syncImageSlots(goods.value, coverPreviewFromNav.value)
    }
  }

  async function applyGoodsImages(data: Goods) {
    syncImageSlots(data, coverPreviewFromNav.value)

    const fileIds = imageFileIds.value
    if (!fileIds.length) return

    void resolveCloudImageMap(fileIds).catch((err) => {
      console.warn('[goodsDetail] prefetch full urls failed:', err)
    })
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
    const hasHero = imageFileIds.value.length > 0 || !!coverPreviewFromNav.value.trim()
    loading.value = force ? true : !hasHero && !hasCacheEntry(goodsPublicDetailKey(goodsId.value))
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
      showToast({
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
    await goodsLiveSync.resetVersionBaseline()
  }

  useGoodsLiveSync({
    getTargetIds: () => (goodsId.value ? [goodsId.value] : []),
    applyPatches: async ({ patches, missingIds }) => {
      if (missingIds.includes(goodsId.value)) {
        if (goods.value.onSale === false && goods.value.stock <= 0) return
        goods.value = { ...goods.value, onSale: false, stock: 0 }
        return
      }
      const patch = patches.find((item) => item._id === goodsId.value)
      if (!patch || !hasGoodsLiveDiff(goods.value, patch)) return

      const prevImagesKey = [pickCoverFileId(goods.value), ...(goods.value.images || [])].join('|')
      const [withImage] = await attachGoodsCoverImages([patch], [
        goods.value as Goods & { imageUrl?: string },
      ])
      const { item, changed } = mergeGoodsLivePatch(
        goods.value as Goods & { imageUrl?: string },
        withImage,
      )
      if (!changed) return

      goods.value = item
      const nextImagesKey = [pickCoverFileId(item), ...(item.images || [])].join('|')
      if (prevImagesKey !== nextImagesKey) {
        await applyGoodsImages(item)
      }
    },
  })

  function formatPrice(price: number) {
    return Number(price).toFixed(2).replace(/\.00$/, '')
  }

  function goWikiFull() {
    if (!wikiEntry.value) return
    const name = getWikiDisplayName(wikiEntry.value)
    navigateTo({
      url: `/pagesCustomer/wiki/detail?id=${wikiEntry.value._id}&tab=care&from=goods&name=${encodeURIComponent(name)}`,
    })
  }

  const heroReady = () => imageFileIds.value.length > 0 || !!coverPreviewFromNav.value.trim()

  return {
    ensure,
    onLoad,
    refreshOnShow: false,
    pullDownRefresh: false,
    wikiSectionTitle,
    goods,
    images,
    imageFileIds,
    goodsId,
    loading,
    heroReady,
    wikiEntry,
    formatPrice,
    goWikiFull,
  }
}
