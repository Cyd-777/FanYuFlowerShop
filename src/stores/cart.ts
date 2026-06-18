import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { STORAGE_KEYS } from '@/utils/constants'
import { updateCartTabBadge } from '@/utils/cartBadge'
import type { Goods } from '@/types/goods'
import type { CartLineItem } from '@/types/cart'
import { CUSTOM_CART_GOODS_ID } from '@/types/cart'
import type { CustomBouquetDraft } from '@/types/customBouquet'
import { calcCustomBouquetPrice } from '@/types/customBouquet'

function normalizeCartLine(raw: Partial<CartLineItem>): CartLineItem | null {
  if (!raw || typeof raw.goodsId !== 'string') return null
  const kind = raw.kind === 'custom' ? 'custom' : 'goods'
  const lineKey = raw.lineKey || raw.goodsId
  return {
    lineKey,
    kind,
    goodsId: raw.goodsId,
    name: raw.name || '',
    price: Number(raw.price) || 0,
    unit: raw.unit && ['支', '组', '束', '件'].includes(raw.unit) ? raw.unit : '束',
    stock: Number(raw.stock) || 0,
    image: raw.image || '',
    count: Math.max(1, Number(raw.count) || 1),
    checked: raw.checked !== false,
    customSummary: raw.customSummary,
  }
}

function readCartItems(): CartLineItem[] {
  const raw = wx.getStorageSync(STORAGE_KEYS.Cart)
  if (!Array.isArray(raw)) return []
  return raw.map((item) => normalizeCartLine(item)).filter(Boolean) as CartLineItem[]
}

function writeCartItems(items: CartLineItem[]) {
  wx.setStorageSync(STORAGE_KEYS.Cart, items)
}

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartLineItem[]>(readCartItems())

  const checkedItems = computed(() => items.value.filter((i) => i.checked))
  const allChecked = computed(
    () => items.value.length > 0 && items.value.every((i) => i.checked),
  )
  const checkedTotalPrice = computed(() =>
    checkedItems.value.reduce((sum, i) => sum + i.price * i.count, 0),
  )
  const totalCount = computed(() =>
    items.value.reduce((sum, i) => sum + i.count, 0),
  )

  function refreshBadge() {
    updateCartTabBadge(totalCount.value)
  }

  watch(
    items,
    (next) => {
      writeCartItems(next)
      refreshBadge()
    },
    { deep: true },
  )

  refreshBadge()

  function findIndex(lineKey: string) {
    return items.value.findIndex((i) => i.lineKey === lineKey)
  }

  function getCountInCart(goodsId: string) {
    return items.value
      .filter((i) => i.kind === 'goods' && i.goodsId === goodsId)
      .reduce((sum, i) => sum + i.count, 0)
  }

  function addItem(goods: Goods, displayImage: string, count: number) {
    const qty = Math.max(1, Math.floor(count))
    const lineKey = goods._id
    const idx = findIndex(lineKey)
    const nextCount = (idx >= 0 ? items.value[idx].count : 0) + qty

    if (nextCount > goods.stock) {
      const remain = Math.max(0, goods.stock - (idx >= 0 ? items.value[idx].count : 0))
      if (remain <= 0) {
        throw new Error(`购物车中已达库存上限（${goods.stock}${goods.unit}）`)
      }
      throw new Error(`库存不足，还可加购 ${remain}${goods.unit}`)
    }

    const line: CartLineItem = {
      lineKey,
      kind: 'goods',
      goodsId: goods._id,
      name: goods.name,
      price: goods.price,
      unit: goods.unit,
      stock: goods.stock,
      image: displayImage,
      count: nextCount,
      checked: true,
    }

    if (idx >= 0) {
      items.value[idx] = { ...items.value[idx], ...line }
    } else {
      items.value.push(line)
    }
  }

  function addCustomBouquet(draft: CustomBouquetDraft): string {
    const summaryParts = [
      `花材：${draft.flowers.map((item) => item.name).join('、')}`,
      `包装：${draft.packaging?.name || '未选'}`,
    ]
    if (draft.card) {
      summaryParts.push(`贺卡：${draft.card.name}`)
    }
    if (draft.cardMessage.trim()) {
      summaryParts.push(`留言：${draft.cardMessage.trim()}`)
    }

    const price = calcCustomBouquetPrice(draft)
    const thumb = draft.flowers[0]?.image || draft.packaging?.image || ''
    const lineKey = `custom:${Date.now()}`

    const line: CartLineItem = {
      lineKey,
      kind: 'custom',
      goodsId: CUSTOM_CART_GOODS_ID,
      name: '定制花束',
      price,
      unit: '束',
      stock: 1,
      image: thumb,
      count: 1,
      checked: true,
      customSummary: summaryParts.join('；'),
    }
    items.value.push(line)
    return lineKey
  }

  function setCount(lineKey: string, count: number) {
    const idx = findIndex(lineKey)
    if (idx < 0) return

    if (count <= 0) {
      items.value.splice(idx, 1)
      return
    }

    const line = items.value[idx]
    if (line.kind === 'custom') return
    if (count > line.stock) {
      throw new Error(`库存不足，最多 ${line.stock}${line.unit}`)
    }
    line.count = count
  }

  function applyGoodsSnapshot(goodsId: string, goods: Goods) {
    items.value.forEach((line, idx) => {
      if (line.kind !== 'goods' || line.goodsId !== goodsId) return
      items.value[idx] = {
        ...line,
        name: goods.name,
        price: goods.price,
        unit: goods.unit,
        stock: goods.stock,
      }
    })
  }

  function increase(lineKey: string) {
    const idx = findIndex(lineKey)
    if (idx < 0) return
    setCount(lineKey, items.value[idx].count + 1)
  }

  function increaseWithGoods(goodsId: string, goods: Goods) {
    const idx = items.value.findIndex((i) => i.kind === 'goods' && i.goodsId === goodsId)
    if (idx < 0) return

    const line = items.value[idx]
    const nextCount = line.count + 1
    if (nextCount > goods.stock) {
      applyGoodsSnapshot(goodsId, goods)
      throw new Error(`库存不足，最多 ${goods.stock}${goods.unit}`)
    }

    items.value[idx] = {
      ...line,
      name: goods.name,
      price: goods.price,
      unit: goods.unit,
      stock: goods.stock,
      count: nextCount,
    }
  }

  function decrease(lineKey: string) {
    const idx = findIndex(lineKey)
    if (idx < 0) return
    setCount(lineKey, items.value[idx].count - 1)
  }

  function removeItem(lineKey: string) {
    const idx = findIndex(lineKey)
    if (idx >= 0) items.value.splice(idx, 1)
  }

  function replaceItems(next: CartLineItem[]) {
    items.value = next
  }

  function toggleChecked(lineKey: string) {
    const idx = findIndex(lineKey)
    if (idx < 0) return
    items.value[idx].checked = !items.value[idx].checked
  }

  function toggleAllChecked() {
    const next = !allChecked.value
    items.value.forEach((i) => {
      i.checked = next
    })
  }

  function setOnlyChecked(lineKey: string) {
    items.value.forEach((i) => {
      i.checked = i.lineKey === lineKey
    })
  }

  function removeChecked() {
    items.value = items.value.filter((i) => !i.checked)
  }

  return {
    items,
    checkedItems,
    allChecked,
    checkedTotalPrice,
    totalCount,
    getCountInCart,
    addItem,
    addCustomBouquet,
    setCount,
    applyGoodsSnapshot,
    increase,
    increaseWithGoods,
    decrease,
    removeItem,
    replaceItems,
    toggleChecked,
    toggleAllChecked,
    setOnlyChecked,
    removeChecked,
    refreshBadge,
  }
})
