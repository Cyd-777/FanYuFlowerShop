import { getPublicGoods, validateGoodsForPurchase } from '@/services/goods'
import {
  isCloudFileId,
  pickCoverFileId,
  pickDisplayImage,
  resolveCloudImageMap,
} from '@/utils/goodsImage'
import type { CartLineItem } from '@/types/cart'
import type { Goods } from '@/types/goods'
import { useCartStore } from '@/stores/cart'

export interface CartSyncResult {
  items: CartLineItem[]
  removedNames: string[]
  adjusted: Array<{ name: string; from: number; to: number }>
}

export async function syncCartWithServer(items: CartLineItem[]): Promise<CartSyncResult> {
  const removedNames: string[] = []
  const adjusted: CartSyncResult['adjusted'] = []
  const next: CartLineItem[] = []

  for (const line of items) {
    if (line.kind === 'custom') {
      next.push({ ...line })
      continue
    }

    try {
      const goods = await getPublicGoods(line.goodsId)
      if (!goods.onSale) {
        removedNames.push(line.name)
        continue
      }

      let count = line.count
      if (count > goods.stock) {
        adjusted.push({ name: line.name, from: count, to: goods.stock })
        count = goods.stock
      }

      const coverId = pickCoverFileId(goods)
      const image = line.image && !isCloudFileId(line.image) ? line.image : coverId

      next.push({
        lineKey: line.lineKey || line.goodsId,
        kind: 'goods',
        goodsId: line.goodsId,
        name: goods.name,
        price: goods.price,
        unit: goods.unit,
        stock: goods.stock,
        image,
        count,
        checked: line.checked,
      })
    } catch {
      removedNames.push(line.name)
    }
  }

  const cloudIds = next.map((item) => item.image).filter(isCloudFileId)
  if (cloudIds.length) {
    const map = await resolveCloudImageMap(cloudIds)
    next.forEach((item) => {
      if (isCloudFileId(item.image)) {
        item.image = pickDisplayImage(item.image, map)
      }
    })
  }

  return { items: next, removedNames, adjusted }
}

export async function fetchGoodsForCartIncrease(goodsId: string): Promise<Goods> {
  const goods = await getPublicGoods(goodsId)
  if (!goods.onSale) {
    throw new Error('商品已下架')
  }
  if (goods.stock <= 0) {
    throw new Error('商品已售罄')
  }
  return goods
}

export async function addGoodsToCart(
  goodsId: string,
  count: number,
  displayImage = '',
): Promise<Goods> {
  const cartStore = useCartStore()
  const fresh = await validateGoodsForPurchase(goodsId)
  cartStore.addItem(fresh, displayImage, count)
  return fresh
}
