import { showToast } from '@/utils/feedback'
import { ref } from 'vue'
import { listWarehouseLedger } from '@/services/warehouse'
import type { WarehouseLedgerFilter, WarehouseLedgerRecord } from '@/types/stockOut'
import type { PageEnsureContext } from '../types'
import type { PageSetupResult } from '../pageRegistry'

export function setupMerchantWarehouseHistoryPageData(): PageSetupResult & Record<string, unknown> {
  const records = ref<WarehouseLedgerRecord[]>([])
  const loading = ref(false)
  const filterType = ref<WarehouseLedgerFilter>('')

  async function loadRecords() {
    loading.value = true
    try {
      records.value = await listWarehouseLedger({
        type: filterType.value,
        limit: 80,
      })
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
    void ctx
    await loadRecords()
  }

  async function setFilter(type: WarehouseLedgerFilter) {
    if (filterType.value === type) return
    filterType.value = type
    await loadRecords()
  }

  return {
    ensure,
    refreshOnShow: true,
    pullDownRefresh: false,
    records,
    loading,
    filterType,
    setFilter,
    reload: loadRecords,
  }
}
