<template>
  <view class="page-merchant-order" id="merchant-order-list-scroll-body">
    <AppNavBar />
    <view class="order-list-tabs-sticky page-sticky-tabs" :style="navSearchStickyStyle">
      <OrderListStatusTabs v-model="activeTab" />
    </view>

    <view v-if="loading" class="loading-tip">{{ loadingTipText }}</view>

    <template v-else>
      <OrderListCard
        v-for="order in orders"
        :key="order._id"
        :order="order"
        @tap="goDetail(order._id)"
      >
        <template v-if="order.status === 'pending'" #footer>
          <nut-button size="small" type="primary" @click.stop="acceptOrder(order._id)">
            接单
          </nut-button>
        </template>
      </OrderListCard>

      <nut-empty v-if="!orders.length" description="暂无订单" />
    </template>
    <ScrollListTailSpacer
      content-selector="#merchant-order-list-scroll-body"
      :watch-key="`${loading}-${orders.length}-${activeTab}`"
    />
  </view>
</template>

<script setup lang="ts">
import { showToast } from '@/utils/feedback'
import { ref, watch, onUnmounted } from 'vue'
import { useDidShow, useLoad } from '@tarojs/taro'
import { listMerchantOrders, updateOrderStatus } from '@/modules/order'
import type { OrderListTab } from '@/modules/order'
import { navigateTo } from '@/utils/router'
import OrderListCard from '@/components/OrderListCard.vue'
import OrderListStatusTabs from '@/components/OrderListStatusTabs.vue'
import { usePageSticky } from '@/composables/usePageSticky'
import type { Order } from '@/types/order'

const loadingTipText = '加载中…'

const { navSearchStickyStyle } = usePageSticky()

type TabKey = OrderListTab

const activeTab = ref<TabKey>('all')
const orders = ref<Order[]>([])
const loading = ref(false)
let pollTimer: ReturnType<typeof setInterval> | null = null

/** 30 秒轮询新订单 */
function startPolling() {
  stopPolling()
  pollTimer = setInterval(() => {
    void loadOrders()
  }, 30000)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

useLoad((options) => {
  const status = typeof options?.status === 'string' ? options.status : 'all'
  if (status === 'pending' || status === 'processing' || status === 'completed' || status === 'cancelled') {
    activeTab.value = status
  } else {
    activeTab.value = 'all'
  }
})

useDidShow(() => {
  void loadOrders()
  startPolling()
})

watch(activeTab, () => {
  void loadOrders()
})

onUnmounted(() => {
  stopPolling()
})

async function loadOrders() {
  loading.value = true
  try {
    orders.value = await listMerchantOrders(activeTab.value)
  } catch (err) {
    orders.value = []
    showToast({
      title: err instanceof Error ? err.message : '加载失败',
      icon: 'none',
    })
  } finally {
    loading.value = false
  }
}

function goDetail(id: string) {
  navigateTo({ url: `/pagesMerchant/order/detail?id=${id}` })
}

async function acceptOrder(id: string) {
  try {
    await updateOrderStatus(id, 'accepted')
    showToast({ title: '已接单', icon: 'success' })
    void loadOrders()
  } catch (err) {
    showToast({
      title: err instanceof Error ? err.message : '操作失败',
      icon: 'none',
    })
  }
}
</script>

<style lang="less">
.page-merchant-order {
  background: @color-bg-page;
  min-height: 100vh;
  padding-bottom: 32rpx;
}
.loading-tip {
  padding: 48rpx;
  text-align: center;
  font-size: 26rpx;
  color: #999;
}
</style>
