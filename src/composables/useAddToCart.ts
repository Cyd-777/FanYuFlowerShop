import { ref } from 'vue'
import { addGoodsToCart } from '@/modules/cart'
import { useCartStore } from '@/stores/cart'
import type { Goods } from '@/types/goods'

export function useAddToCart() {
  const cartStore = useCartStore()
  const adding = ref(false)

  async function addToCart(params: {
    goodsId: string
    count?: number
    displayImage?: string
  }): Promise<Goods | null> {
    if (!params.goodsId || adding.value) return null

    adding.value = true
    try {
      return await addGoodsToCart(
        params.goodsId,
        params.count ?? 1,
        params.displayImage ?? '',
      )
    } finally {
      adding.value = false
    }
  }

  function buyNow(params: {
    goodsId: string
    count?: number
    displayImage?: string
  }) {
    return addToCart(params).then((goods) => {
      if (!goods) return false
      cartStore.setOnlyChecked(goods._id)
      wx.navigateTo({ url: '/pagesCustomer/order/confirm' })
      return true
    })
  }

  return {
    adding,
    cartStore,
    addToCart,
    buyNow,
  }
}
