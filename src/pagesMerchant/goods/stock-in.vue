<template>
  <view class="page-stock-in" :class="{ 'has-footer': lines.length }">
    <AppNavBar />
    <view v-if="!lines.length" class="empty-tip">{{ uiText_a543ee }}</view>

    <view v-else>
      <view class="mode-tip">{{ modeTip }}</view>
      <view class="line-list">
      <view
        v-for="line in lines"
        :key="line.lineKey"
        class="line-item"
        :class="{ disabled: !line.goodsId, clickable: canCreate(line) }"
        @click="onLineTap(line)"
      >
        <view class="line-main">
          <view class="line-name">{{ line.name }}</view>
          <view v-if="line.colorHint" class="line-hint">花色：{{ line.colorHint }}</view>
          <view v-if="!line.goodsId" class="line-status">{{ uiText_d23414 }}</view>
          <view v-else class="line-status ok">
            当前在库 {{ line.currentStock ?? 0 }}{{ line.unit || '件' }}
          </view>
        </view>

        <view v-if="line.goodsId" class="counter" @click.stop>
          <view class="counter-btn" @click="bumpQuantity(line.lineKey, -1)">−</view>
          <input
            class="counter-input"
            type="number"
            :value="String(line.quantity)"
            @input="onQtyInput(line.lineKey, $event)"
          />
          <view class="counter-btn" @click="bumpQuantity(line.lineKey, 1)">+</view>
        </view>

        <view v-else class="counter disabled-counter">—</view>
      </view>
      </view>
    </view>

    <view v-if="lines.length" class="footer">
      <view class="summary">共 {{ lines.length }} 项 · 可入库 {{ readyCount }} 项</view>
      <nut-button
        type="primary"
        block
        class="submit-btn"
        :loading="submitting"
        :disabled="readyCount <= 0"
        @click="submit"
      >
        提交进货单
      </nut-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePageData } from '@/composables/usePageData'
import { navigateTo } from '@/utils/router'
import type { StockInLine } from '@/types/stockIn'

const uiText_a543ee = '暂无入库项，请从商品列表进入'
const uiText_d23414 = '仓库暂无此商品，点击创建'

const {
  session,
  lines,
  submitting,
  bumpQuantity,
  setQuantity,
  submit,
} = usePageData()

const readyCount = computed(
  () => lines.value.filter((line) => line.goodsId && line.quantity > 0).length,
)

const modeTip = computed(() => {
  if (session.value?.mode === 'import') {
    return '进货单识别结果，请用计数器设置入库数量'
  }
  return '已选商品，请用计数器设置入库数量'
})

function canCreate(line: StockInLine) {
  return session.value?.mode === 'import' && !line.goodsId
}

function onLineTap(line: StockInLine) {
  if (!canCreate(line)) return
  const query = [
    'from=stock-in',
    `stockInLineKey=${encodeURIComponent(line.lineKey)}`,
    `prefillName=${encodeURIComponent(line.name)}`,
  ]
  if (line.colorHint) {
    query.push(`prefillColor=${encodeURIComponent(line.colorHint)}`)
  }
  navigateTo({ url: `/pagesMerchant/goods/edit?${query.join('&')}` })
}

function onQtyInput(lineKey: string, event: { detail: { value: string } }) {
  const value = parseInt(event.detail.value, 10)
  setQuantity(lineKey, Number.isNaN(value) ? 0 : value)
}
</script>

<style lang="less">
.page-stock-in {
  min-height: 100vh;
  background: #f8f8f8;
  padding: 16rpx 16rpx 180rpx;
  box-sizing: border-box;
}
.empty-tip {
  padding: 80rpx 32rpx;
  text-align: center;
  font-size: 26rpx;
  color: #999;
}
.mode-tip {
  margin-bottom: 16rpx;
  padding: 20rpx 24rpx;
  background: #fff;
  border-radius: 16rpx;
  font-size: 24rpx;
  color: #666;
  line-height: 1.5;
}
.line-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.line-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx;
  background: #fff;
  border-radius: 16rpx;
  &.disabled {
    opacity: 0.92;
  }
  &.clickable:active {
    background: #fafafa;
  }
}
.line-main {
  flex: 1;
  min-width: 0;
}
.line-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}
.line-hint,
.line-status {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #999;
}
.line-status.ok {
  color: #667eea;
}
.counter {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex-shrink: 0;
}
.counter-btn {
  width: 56rpx;
  height: 56rpx;
  line-height: 52rpx;
  text-align: center;
  border-radius: 12rpx;
  background: #f5f5f5;
  font-size: 32rpx;
  color: #333;
}
.counter-input {
  width: 88rpx;
  height: 56rpx;
  text-align: center;
  font-size: 28rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
}
.disabled-counter {
  width: 160rpx;
  text-align: center;
  font-size: 28rpx;
  color: #ccc;
}
.footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 16rpx 32rpx calc(16rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 2rpx solid #eee;
}
.summary {
  margin-bottom: 12rpx;
  font-size: 24rpx;
  color: #999;
  text-align: center;
}
.submit-btn {
  border-radius: 48rpx;
  height: 88rpx;
}
</style>
