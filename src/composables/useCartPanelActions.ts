import { showToast } from '@/utils/feedback'
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { navigateTo, navigateToGoodsDetail, switchTab } from '@/utils/router'
import { useCartStore } from '@/stores/cart'
import { fetchGoodsForCartIncrease, syncCartWithServer } from '@/services/cart'
import { CUSTOM_CART_GOODS_ID } from '@/types/cart'
import type { CartLineItem } from '@/types/cart'

export function useCartPanelActions() {
  const cartStore = useCartStore()
  const { items, allChecked } = storeToRefs(cartStore)
  const syncing = ref(false)

  const totalPrice = computed(() => cartStore.checkedTotalPrice.toFixed(2))
  const totalCount = computed(() => cartStore.totalCount)

  function formatPrice(price: number) {
    return Number(price).toFixed(2).replace(/\.00$/, '')
  }

  async function syncCart() {
    if (!cartStore.items.length) return

    syncing.value = true
    try {
      const result = await syncCartWithServer(cartStore.items)
      cartStore.replaceItems(result.items)

      if (result.removedNames.length) {
        showToast({
          title: `${result.removedNames.length} 件商品已失效并移除`,
          icon: 'none',
        })
      } else if (result.adjusted.length) {
        showToast({
          title: '部分商品数量已按库存调整',
          icon: 'none',
        })
      }
    } catch (err) {
      console.warn('[cart] sync failed:', err)
    } finally {
      syncing.value = false
    }
  }

  function toggleItem(lineKey: string) {
    cartStore.toggleChecked(lineKey)
  }

  function toggleAll() {
    cartStore.toggleAllChecked()
  }

  async function increase(item: CartLineItem) {
    if (item.kind !== 'goods' || item.count >= item.stock) return

    try {
      const goods = await fetchGoodsForCartIncrease(item.goodsId)
      cartStore.increaseWithGoods(item.goodsId, goods)
    } catch (err) {
      const message = err instanceof Error ? err.message : '操作失败'
      if (message.includes('下架') || message.includes('售罄')) {
        cartStore.removeItem(item.lineKey)
      }
      showToast({ title: message, icon: 'none' })
    }
  }

  function decrease(lineKey: string) {
    cartStore.decrease(lineKey)
  }

  function remove(lineKey: string) {
    cartStore.removeItem(lineKey)
  }

  function openItem(item: CartLineItem) {
    if (item.kind === 'custom' || item.goodsId === CUSTOM_CART_GOODS_ID) return
    navigateToGoodsDetail(item.goodsId, item.image)
  }

  function goHome() {
    switchTab({ url: '/pages/home/index' })
  }

  function goFullCart() {
    switchTab({ url: '/pages/cart/index' })
  }

  function goCheckout(): boolean {
    if (!cartStore.checkedItems.length) {
      showToast({ title: '请选择要结算的商品', icon: 'none' })
      return false
    }
    if (cartStore.checkedItems.some((item) => item.kind === 'goods' && item.stock <= 0)) {
      showToast({ title: '所选商品含售罄商品', icon: 'none' })
      return false
    }
    navigateTo({ url: '/pagesCustomer/order/confirm' })
    return true
  }

  return {
    items,
    allChecked,
    syncing,
    totalPrice,
    totalCount,
    formatPrice,
    syncCart,
    toggleItem,
    toggleAll,
    increase,
    decrease,
    remove,
    openItem,
    goHome,
    goFullCart,
    goCheckout,
  }
}
