import { showToast } from '@/utils/feedback'
import { computed, ref } from 'vue'
import { useMerchantGoods } from '@/composables/useMerchantGoods'
import { navigateBack } from '@/utils/router'
import { readMerchantGoodsPick, writeMerchantGoodsPick } from '@/types/merchantPick'
import type { PageEnsureContext } from '../types'
import type { PageSetupResult } from '../pageRegistry'

export function setupMerchantGoodsPickerPageData(): PageSetupResult & Record<string, unknown> {
  const { goodsList, loading, loadGoods } = useMerchantGoods()
  const selectedIds = ref<string[]>([])
  const ruleId = ref('')
  const ready = ref(false)

  const displayList = computed(() => goodsList.value)

  function onLoad(_query: Record<string, string | undefined>) {
    const ctx = readMerchantGoodsPick()
    ruleId.value = ctx?.ruleId || ''
    selectedIds.value = ctx?.selectedIds ? [...ctx.selectedIds] : []
    ready.value = true
  }

  async function ensure(_ctx: PageEnsureContext) {
    await loadGoods()
  }

  function formatPrice(price: number) {
    return Number(price).toFixed(2).replace(/\.00$/, '')
  }

  function isSelected(id: string) {
    return !!id && selectedIds.value.includes(id)
  }

  function toggle(id: string) {
    if (!id || !ready.value) return

    const next = new Set(selectedIds.value)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    selectedIds.value = [...next]
  }

  function confirm() {
    if (!ruleId.value) {
      showToast({ title: '折扣信息丢失，请返回重试', icon: 'none' })
      return
    }
    writeMerchantGoodsPick({
      ruleId: ruleId.value,
      selectedIds: [...selectedIds.value],
      consumed: false,
    })
    navigateBack()
  }

  return {
    ensure,
    onLoad,
    refreshOnShow: false,
    pullDownRefresh: false,
    goodsList,
    displayList,
    loading,
    selectedIds,
    formatPrice,
    isSelected,
    toggle,
    confirm,
  }
}
