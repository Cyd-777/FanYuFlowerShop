<template>
  <view class="page-order-list" id="customer-order-list-scroll-body">
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
        order-no-prefix
        @tap="goDetail(order._id)"
      />

      <nut-empty v-if="!orders.length" :description="emptyOrdersText" />
    </template>
    <ScrollListTailSpacer
      content-selector="#customer-order-list-scroll-body"
      :watch-key="`${loading}-${orders.length}-${activeTab}`"
    />
  </view>
</template>

<script setup lang="ts">
import { showToast } from '@/utils/feedback'
import { ref, watch } from 'vue'
import { useDidShow, useLoad } from '@tarojs/taro'
import { listMyOrders } from '@/modules/order'
import type { OrderListTab } from '@/modules/order'
import { navigateTo } from '@/utils/router'
import OrderListCard from '@/components/OrderListCard.vue'
import OrderListStatusTabs from '@/components/OrderListStatusTabs.vue'
import { usePageSticky } from '@/composables/usePageSticky'
import type { Order } from '@/types/order'

const { navSearchStickyStyle } = usePageSticky()

type TabKey = OrderListTab

const loadingTipText = '加载中…'
const emptyOrdersText = '暂无订单'

const activeTab = ref<TabKey>('all')
const orders = ref<Order[]>([])
const loading = ref(false)

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
})

watch(activeTab, () => {
  void loadOrders()
})

async function loadOrders() {
  loading.value = true
  try {
    orders.value = await listMyOrders(activeTab.value)
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
  navigateTo({ url: `/pagesCustomer/order/detail?id=${id}` })
}
</script>

<style lang="less">
.page-order-list {
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
