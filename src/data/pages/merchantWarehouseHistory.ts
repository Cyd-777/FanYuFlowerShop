import { showToast } from '@/utils/feedback'
import { ref } from 'vue'
import { listWarehouseLedger } from '@/services/warehouse'
import type { WarehouseLedgerBatch, WarehouseLedgerFilter } from '@/types/stockOut'
import type { PageEnsureContext } from '../types'
import type { PageSetupResult } from '../pageRegistry'

export function setupMerchantWarehouseHistoryPageData(): PageSetupResult & Record<string, unknown> {
  const batches = ref<WarehouseLedgerBatch[]>([])
  const loading = ref(false)
  const errorMsg = ref('')
  const filterType = ref<WarehouseLedgerFilter>('')

  async function loadRecords() {
    loading.value = true
    errorMsg.value = ''
    try {
      const result = await listWarehouseLedger({
        type: filterType.value,
        limit: 80,
      })
      batches.value = result || []
      if (!batches.value.length) {
        errorMsg.value = '暂无仓储流水记录'
      }
    } catch (err) {
      errorMsg.value = err instanceof Error ? err.message : '加载失败'
      showToast({
        title: errorMsg.value,
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
    batches,
    loading,
    errorMsg,
    filterType,
    setFilter,
    reload: loadRecords,
  }
}
