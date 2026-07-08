import { showToast } from '@/utils/feedback'
import { computed, ref } from 'vue'
import { usePublicCategories } from '@/composables/usePublicCategories'
import { goodsRepository } from '@/data/repository'
import { attachGoodsCoverImages } from '@/utils/goodsImage'
import { navigateBack } from '@/utils/router'
import {
  CUSTOM_BOUQUET_DRAFT_KEY,
  CUSTOM_BOUQUET_ROLE_LABELS,
  FLOWER_CATEGORIES,
  FLOWER_CATEGORY_META,
  createEmptyCustomBouquetDraft,
} from '@/types/customBouquet'
import type {
  CustomBouquetDraft,
  CustomBouquetFlowerCategory,
  CustomBouquetGoodsItem,
  CustomBouquetPickRole,
} from '@/types/customBouquet'
import type { Goods } from '@/types/goods'
import type { PageEnsureContext } from '../types'
import type { PageSetupResult } from '../pageRegistry'

type GoodsCard = Goods & { imageUrl: string }

export function setupCustomizePickPageData(): PageSetupResult & Record<string, unknown> {
  const role = ref<CustomBouquetPickRole>('flower')
  const category = ref<CustomBouquetFlowerCategory | ''>('')
  const loading = ref(false)
  const goodsList = ref<GoodsCard[]>([])
  const selectedIds = ref<string[]>([])
  const { categories, loadCategories } = usePublicCategories()

  const roleLabel = computed(() => CUSTOM_BOUQUET_ROLE_LABELS[role.value])

  const categoryMeta = computed(() =>
    category.value ? FLOWER_CATEGORY_META[category.value] : null,
  )

  const isMulti = computed(() => role.value === 'flower')

  const pickTip = computed(() => {
    if (role.value === 'flower' && categoryMeta.value) {
      return categoryMeta.value.pickTip
    }
    return role.value === 'flower'
      ? '所有按「支」售卖的商品均可作为花材'
      : `从「${roleLabel.value}」分类商品中选择`
  })

  const emptyTip = computed(() => {
    if (role.value === 'flower' && categoryMeta.value) {
      return `暂无可用${categoryMeta.value.label}商品。请让商家上架相关花材。`
    }
    return role.value === 'flower'
      ? '暂无按支售卖的商品。请让商家上架论支销售的花材。'
      : `暂无可用商品。请让商家创建「${roleLabel.value}」分类并上架商品。`
  })

  function onLoad(query: Record<string, string | undefined>) {
    const rawRole = query.role as CustomBouquetPickRole | undefined
    if (rawRole === 'flower' || rawRole === 'packaging' || rawRole === 'card') {
      role.value = rawRole
    }

    const rawCategory = query.category as CustomBouquetFlowerCategory | undefined
    if (rawCategory && (FLOWER_CATEGORIES as readonly string[]).includes(rawCategory)) {
      category.value = rawCategory
    }

    wx.setNavigationBarTitle({
      title: categoryMeta.value
        ? `选择${categoryMeta.value.label}`
        : `选择${roleLabel.value}`,
    })

    const draft = wx.getStorageSync(CUSTOM_BOUQUET_DRAFT_KEY) as CustomBouquetDraft | ''
    if (draft && typeof draft === 'object') {
      if (role.value === 'flower') {
        if (category.value) {
          selectedIds.value = draft.flowers
            .filter((item) => item.category === category.value)
            .map((item) => item.goodsId)
        } else {
          selectedIds.value = draft.flowers.map((item) => item.goodsId)
        }
      } else if (role.value === 'packaging' && draft.packaging) {
        selectedIds.value = [draft.packaging.goodsId]
      } else if (role.value === 'card' && draft.card) {
        selectedIds.value = [draft.card.goodsId]
      }
    }
  }

  function isPickableGoods(item: Goods) {
    return item.onSale && item.stock > 0
  }

  async function loadGoods() {
    loading.value = true
    try {
      const { data } = await goodsRepository.ensurePublicList({})
      const withImages = await attachGoodsCoverImages(data)

      if (role.value === 'flower') {
        goodsList.value = withImages.filter(
          (item) => item.unit === '支' && isPickableGoods(item),
        )
      } else {
        await loadCategories()
        const categoryIds = categories.value
          .filter((item) => item.customRole === role.value)
          .map((item) => item._id)
        goodsList.value = withImages.filter(
          (item) => categoryIds.includes(item.categoryId) && isPickableGoods(item),
        )
      }
    } catch (err) {
      goodsList.value = []
      showToast({
        title: err instanceof Error ? err.message : '加载商品失败',
        icon: 'none',
      })
    } finally {
      loading.value = false
    }
  }

  async function ensure(_ctx: PageEnsureContext) {
    await loadGoods()
  }

  function formatPrice(price: number) {
    return Number(price).toFixed(2).replace(/\.00$/, '')
  }

  function isSelected(id: string) {
    return selectedIds.value.includes(id)
  }

  function toggleItem(item: GoodsCard) {
    if (item.stock <= 0) return

    if (isMulti.value) {
      const idx = selectedIds.value.indexOf(item._id)
      if (idx >= 0) selectedIds.value.splice(idx, 1)
      else selectedIds.value.push(item._id)
      return
    }

    selectedIds.value = [item._id]
  }

  function toGoodsItem(item: GoodsCard): CustomBouquetGoodsItem {
    return {
      goodsId: item._id,
      name: item.name,
      price: item.price,
      unit: item.unit,
      image: item.imageUrl,
    }
  }

  function confirmPick() {
    const picked = goodsList.value.filter((item) => selectedIds.value.includes(item._id))
    const draft = wx.getStorageSync(CUSTOM_BOUQUET_DRAFT_KEY) as CustomBouquetDraft | ''
    const next: CustomBouquetDraft = {
      ...createEmptyCustomBouquetDraft(),
      ...(draft && typeof draft === 'object' ? draft : {}),
    }

    if (role.value === 'flower') {
      if (category.value) {
        next.flowers = [
          ...next.flowers.filter((f) => f.category !== category.value),
          ...picked.map((item) => ({ ...toGoodsItem(item), category: category.value })),
        ]
      } else {
        next.flowers = picked.map(toGoodsItem)
      }
    } else if (role.value === 'packaging') {
      next.packaging = picked[0] ? toGoodsItem(picked[0]) : null
    } else {
      next.card = picked[0] ? toGoodsItem(picked[0]) : null
    }

    wx.setStorageSync(CUSTOM_BOUQUET_DRAFT_KEY, next)
    navigateBack()
  }

  return {
    ensure,
    onLoad,
    refreshOnShow: false,
    pullDownRefresh: false,
    role,
    loading,
    goodsList,
    selectedIds,
    roleLabel,
    isMulti,
    pickTip,
    emptyTip,
    isSelected,
    toggleItem,
    formatPrice,
    confirmPick,
  }
}
