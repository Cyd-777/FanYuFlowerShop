<template>
  <view class="page-warehouse-history">
    <AppNavBar />

    <view class="filter-tabs">
      <view
        v-for="tab in filterTabs"
        :key="tab.value"
        class="filter-tab"
        :class="{ active: filterType === tab.value }"
        @tap="setFilter(tab.value)"
      >
        {{ tab.label }}
      </view>
    </view>

    <view v-if="loading" class="loading-tip">加载中…</view>

    <view v-else-if="!records.length" class="empty-tip">暂无仓储流水记录</view>

    <view v-else class="record-list">
      <view v-for="item in records" :key="item._id" class="record-card">
        <view class="record-head">
          <text class="record-type" :class="typeClass(item.type)">{{ typeLabel(item.type) }}</text>
        </view>
        <view class="record-time">{{ formatWarehouseLedgerTime(item.createdAt) }}</view>
        <view class="record-name">{{ item.goodsName || '未知商品' }}</view>
        <view class="record-meta">
          <text class="delta" :class="deltaClass(item.type)">{{ deltaText(item) }}</text>
          <text class="stock-flow">{{ item.stockBefore }} → {{ item.stockAfter }}{{ item.unit || '件' }}</text>
        </view>
        <view class="record-actor">{{ formatWarehouseLedgerActor(item) }}</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import AppNavBar from '@/components/AppNavBar.vue'
import { usePageData } from '@/composables/usePageData'
import {
  WAREHOUSE_LEDGER_TYPE_LABELS,
  type WarehouseLedgerFilter,
  type WarehouseLedgerRecord,
  type WarehouseLedgerType,
} from '@/types/stockOut'
import {
  formatWarehouseLedgerActor,
  formatWarehouseLedgerTime,
} from '@/utils/warehouseLedger'

const { records, loading, filterType, setFilter } = usePageData()

const filterTabs: Array<{ label: string; value: WarehouseLedgerFilter }> = [
  { label: '全部', value: '' },
  { label: '入库', value: 'stock_in' },
  { label: '出库', value: 'stock_out' },
]

function typeLabel(type: string) {
  return WAREHOUSE_LEDGER_TYPE_LABELS[type as WarehouseLedgerType] || type
}

function typeClass(type: string) {
  if (type === 'stock_in' || type === 'order_rollback') return 'is-in'
  if (type === 'stock_out' || type === 'order_out') return 'is-out'
  return ''
}

function deltaClass(type: string) {
  return typeClass(type)
}

function deltaText(item: WarehouseLedgerRecord) {
  const sign = item.type === 'stock_in' || item.type === 'order_rollback' ? '+' : '−'
  return `${sign}${item.delta}${item.unit || '件'}`
}
</script>

<style lang="less">
.page-warehouse-history {
  min-height: 100vh;
  background: #f8f8f8;
  padding-bottom: 48rpx;
  box-sizing: border-box;
}

.filter-tabs {
  display: flex;
  gap: 16rpx;
  padding: 16rpx 24rpx;
  background: #fff;
  border-bottom: 2rpx solid #eee;
}

.filter-tab {
  padding: 12rpx 28rpx;
  border-radius: 999rpx;
  font-size: 26rpx;
  color: #666;
  background: #f5f5f5;

  &.active {
    color: #fff;
    background: #667eea;
    font-weight: 600;
  }
}

.loading-tip,
.empty-tip {
  padding: 80rpx 32rpx;
  text-align: center;
  font-size: 26rpx;
  color: #999;
  line-height: 1.6;
}

.record-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding: 16rpx 24rpx;
}

.record-card {
  padding: 24rpx;
  background: #fff;
  border-radius: 16rpx;
}

.record-head {
  display: flex;
  align-items: center;
}

.record-type {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  background: #f0f0f0;
  color: #666;

  &.is-in {
    background: #e8f5e9;
    color: #2e7d32;
  }

  &.is-out {
    background: #ffebee;
    color: #c62828;
  }
}

.record-time {
  margin-top: 10rpx;
  font-size: 24rpx;
  color: #999;
}

.record-name {
  margin-top: 12rpx;
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}

.record-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  margin-top: 12rpx;
}

.delta {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;

  &.is-in {
    color: #2e7d32;
  }

  &.is-out {
    color: #c62828;
  }
}

.stock-flow {
  font-size: 24rpx;
  color: #999;
}

.record-actor {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #667eea;
}
</style>
