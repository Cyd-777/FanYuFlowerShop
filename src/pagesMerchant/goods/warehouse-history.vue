<template>
  <view class="page-warehouse-history" :style="navCssVars" id="warehouse-history-scroll-body">
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

    <view v-if="loading" class="loading-tip">{{ loadingTipText }}</view>
    <view v-else-if="errorMsg" class="empty-tip">{{ errorMsg }}</view>
    <view v-else-if="!batches.length" class="empty-tip">{{ uiText_887472 }}</view>

    <view v-else class="timeline">
      <view class="timeline-track" />

      <view
        v-for="(batch, bi) in batches"
        :key="batch.batchId"
        class="tl-row"
      >
        <!-- 第 1 列：时间 -->
        <view class="tl-time-cell" :class="{ 'is-order': batch.type === 'order_out' }">
          <view class="tl-time">
            <text v-if="showYear(batch, bi)" class="tl-year">{{ timePart(batch.createdAt, 'year') }}</text>
            <text v-if="showDate(batch, bi)" class="tl-date">{{ timePart(batch.createdAt, 'date') }}</text>
            <text class="tl-hour">{{ timePart(batch.createdAt, 'hour') }}</text>
          </view>
        </view>

        <!-- 第 2 列：圆点 -->
        <view class="tl-axis-col" :class="{ 'is-order': batch.type === 'order_out' }">
          <view class="tl-dot" :class="dotClass(batch.type)" />
        </view>

        <!-- 第 3 列：卡片 -->
        <view class="batch-card">
          <view class="batch-head">
            <view v-if="isInbound(batch.type)" class="batch-head-left">
              <view v-if="batch.operatorName" class="batch-operator">
                <image v-if="batch.operatorAvatar" class="avatar-img" :src="batch.operatorAvatar" mode="aspectFill" />
                <text v-else class="avatar-circle">{{ avatarText(batch.operatorName) }}</text>
                <text class="opt-name">{{ batch.operatorName }}</text>
              </view>
            </view>
            <view v-else class="batch-head-left">
              <view v-if="batch.type === 'order_out' && batch.orderNo" class="batch-order-line">
                <text class="batch-order-icon">📦</text>
                <text class="batch-order-no">#{{ batch.orderNo }}</text>
              </view>
              <view v-else-if="batch.operatorName" class="batch-operator">
                <image v-if="batch.operatorAvatar" class="avatar-img" :src="batch.operatorAvatar" mode="aspectFill" />
                <text v-else class="avatar-circle">{{ avatarText(batch.operatorName) }}</text>
                <text class="opt-name">{{ batch.operatorName }}</text>
              </view>
            </view>
            <text v-if="isInbound(batch.type)" class="batch-tag batch-tag--in">{{ uiText_fac9f3 }}</text>
            <text v-else class="batch-tag batch-tag--out">{{ uiText_c2ad82 }}</text>
          </view>

          <view class="batch-items">
            <view v-for="(item, idx) in (batch.items || [])" :key="idx" class="batch-item">
              <view class="item-name">{{ item.goodsName || '未知商品' }}</view>
              <view class="item-right">
                <text class="item-delta" :class="deltaClass(batch.type)">{{ deltaSign(batch.type) }}{{ item.delta }}{{ item.unit || '件' }}</text>
                <text class="item-stock">{{ item.stockBefore }} → {{ item.stockAfter }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
    <ScrollListTailSpacer
      content-selector="#warehouse-history-scroll-body"
      :watch-key="`${loading}-${batches.length}-${filterType}`"
    />
  </view>
</template>

<script setup lang="ts">
import AppNavBar from '@/components/AppNavBar.vue'
import { usePageData } from '@/composables/usePageData'
import { useNavBarLayout } from '@/composables/useNavBarLayout'
import { showToast } from '@/utils/feedback'
import {
  type WarehouseLedgerFilter,
} from '@/types/stockOut'

const loadingTipText = '加载中…'
const uiText_887472 = '暂无仓储流水记录'
const uiText_c2ad82 = '出库 ▸'
const uiText_fac9f3 = '入库 ▸'

const { batches, loading, filterType, setFilter, errorMsg } = usePageData()
const { cssVars: navCssVars } = useNavBarLayout()

const filterTabs: Array<{ label: string; value: WarehouseLedgerFilter }> = [
  { label: '全部', value: '' },
  { label: '入库', value: 'stock_in' },
  { label: '出库', value: 'stock_out' },
]

function isInbound(type: string) {
  return type === 'stock_in' || type === 'order_rollback'
}

function deltaClass(type: string) {
  return isInbound(type) ? 'is-in' : 'is-out'
}

function deltaSign(type: string) {
  return isInbound(type) ? '+' : '−'
}

function dotClass(type: string) {
  return isInbound(type) ? 'dot-in' : 'dot-out'
}

function avatarText(name: string): string {
  return (name || '?').charAt(0)
}

function parseTime(t: unknown): Date | null {
  if (!t) return null
  const d = new Date(String(t))
  return isNaN(d.getTime()) ? null : d
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function timePart(t: unknown, part: 'year' | 'date' | 'hour'): string {
  const d = parseTime(t)
  if (!d) return String(t || '')
  if (part === 'year') return `${d.getFullYear()}年`
  if (part === 'date') return `${pad(d.getMonth() + 1)}月${pad(d.getDate())}日`
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function showYear(batch: { createdAt?: unknown }, idx: number): boolean {
  if (idx === 0) return true
  const curr = timePart(batch.createdAt, 'year')
  const prev = timePart(batches.value[idx - 1].createdAt, 'year')
  return curr !== prev
}

function showDate(batch: { createdAt?: unknown }, idx: number): boolean {
  if (idx === 0) return true
  const curr = timePart(batch.createdAt, 'date')
  const prev = timePart(batches.value[idx - 1].createdAt, 'date')
  const sameYear = timePart(batch.createdAt, 'year') === timePart(batches.value[idx - 1].createdAt, 'year')
  return sameYear && curr !== prev
}
</script>
<style lang="less">
.page-warehouse-history { min-height: 100vh; background: @color-bg-page; padding-bottom: 48rpx; box-sizing: border-box; }

.filter-tabs {
  display: flex; gap: 16rpx; padding: 16rpx 24rpx;
  background: #fff; border-bottom: 2rpx solid #eee;
  position: sticky; top: var(--nav-total-height, 0px); z-index: 10;
}
.filter-tab {
  padding: 12rpx 28rpx; border-radius: 999rpx;
  font-size: 26rpx; color: #666; background: @color-bg-muted;
  &.active { color: #fff; background: @color-merchant-start; font-weight: 600; }
}
.loading-tip, .empty-tip { padding: 80rpx 32rpx; text-align: center; font-size: 26rpx; color: #999; }

/* ====== 时间轴 ====== */
.timeline {
  position: relative;
  padding: 32rpx 0 32rpx 24rpx;
}

/* 贯穿线：fixed 定在屏幕上，不随滚动移动 */
.timeline-track {
  position: fixed;
  left: calc(25vw + 34rpx);
  top: var(--nav-total-height, 0px);
  bottom: 0;
  width: 4rpx;
  background: @color-border-dashed;
  z-index: 0;
  pointer-events: none;
}

.tl-row {
  display: flex;
  align-items: flex-start;
  z-index: 1;
  position: relative;
}

/* 第 1 列：时间文字 */
.tl-time-cell {
  width: calc(25vw - 24rpx);
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  padding-top: 20rpx;
  padding-right: 16rpx;
  box-sizing: border-box;
  &.is-order {
    padding-top: 36rpx;
  }
}
.tl-time { text-align: right; line-height: 1.4; }
.tl-year { display: block; font-size: 20rpx; color: #bbb; }
.tl-date { display: block; font-size: 22rpx; color: #999; font-weight: 500; }
.tl-hour { font-size: 24rpx; color: #555; font-weight: 600; }

/* 第 2 列：圆点，固定 72rpx */
.tl-axis-col {
  width: 72rpx;
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  padding-top: 0;
  &.is-order {
    .tl-dot {
      margin-top: 42rpx;
    }
  }
}
.tl-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: @color-border-dashed;
  margin-top: 32rpx;
  z-index: 2;
  position: relative;
  &.dot-in { background: @color-success; }
  &.dot-out { background: @color-danger; }
}

/* 第 3 列：卡片占剩余空间 */
.batch-card { flex: 1; min-width: 0; background: #fff; border-radius: 12rpx; padding: 20rpx; margin-right: 24rpx; margin-bottom: 24rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }

.batch-head { display: flex; align-items: center; justify-content: space-between; gap: 12rpx; }
.batch-head-left { display: flex; align-items: center; gap: 10rpx; flex: 1; min-width: 0; }
.batch-operator { display: flex; align-items: center; gap: 10rpx; }
.avatar-circle { width: 40rpx; height: 40rpx; line-height: 40rpx; text-align: center; border-radius: 50%; background: @color-merchant-start; color: #fff; font-size: 22rpx; font-weight: 600; flex-shrink: 0; }
.avatar-img { width: 40rpx; height: 40rpx; border-radius: 50%; flex-shrink: 0; background: @color-bg-placeholder; }
.opt-name { font-size: 26rpx; color: #333; font-weight: 500; }
.batch-order-line { display: flex; align-items: center; gap: 6rpx; }
.batch-order-icon { font-size: 28rpx; }
.batch-order-no { font-size: 24rpx; color: @color-merchant-start; }
.batch-tag { font-size: 22rpx; padding: 6rpx 16rpx; border-radius: 8rpx; font-weight: 500; flex-shrink: 0; }
.batch-tag--in { background: @color-success-bg; color: @color-success; }
.batch-tag--out { background: @color-danger-bg; color: @color-danger; }
.batch-items { margin-top: 10rpx; border-top: 2rpx solid @color-bg-muted; padding-top: 8rpx; }
.batch-item { display: flex; justify-content: space-between; align-items: center; padding: 6rpx 0; }
.item-name { font-size: 26rpx; color: #333; font-weight: 500; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.item-right { display: flex; align-items: center; gap: 12rpx; flex-shrink: 0; }
.item-delta { font-size: 24rpx; font-weight: 600; color: #333; &.is-in { color: @color-success; } &.is-out { color: @color-danger; } }
.item-stock { font-size: 20rpx; color: #bbb; }
</style>
