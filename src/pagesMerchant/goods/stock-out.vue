<template>
  <view class="page-stock-out" :class="{ 'has-footer': lines.length }">
    <AppNavBar />
    <view v-if="!lines.length" class="empty-tip">{{ uiText_9f31dd }}</view>

    <view v-else>
      <view class="mode-tip">{{ uiText_dac8d4 }}</view>
      <view class="line-list">
        <view
          v-for="line in lines"
          :key="line.lineKey"
          class="line-item"
          :class="{ disabled: line.currentStock <= 0 }"
        >
          <view class="line-main">
            <view class="line-name">{{ line.name }}</view>
            <view v-if="line.currentStock <= 0" class="line-status warn">{{ uiText_8598ae }}</view>
            <view v-else class="line-status ok">
              当前可售 {{ line.currentStock }}{{ line.unit || '件' }}
            </view>
          </view>

          <view v-if="line.currentStock > 0" class="counter" @click.stop>
            <view
              class="counter-btn"
              :class="{ disabled: line.quantity <= 0 }"
              @click="bumpQuantity(line.lineKey, -1)"
            >
              −
            </view>
            <input
              class="counter-input"
              type="number"
              :value="String(line.quantity)"
              @input="onQtyInput(line.lineKey, $event)"
            />
            <view
              class="counter-btn"
              :class="{ disabled: line.quantity >= line.currentStock }"
              @click="bumpQuantity(line.lineKey, 1)"
            >
              +
            </view>
          </view>

          <view v-else class="counter disabled-counter">—</view>
        </view>
      </view>
    </view>

    <view v-if="lines.length" class="footer">
      <view class="summary">共 {{ lines.length }} 项 · 可出库 {{ readyCount }} 项</view>
      <nut-button
        type="primary"
        block
        class="submit-btn"
        :loading="submitting"
        :disabled="readyCount <= 0"
        @click="submit"
      >
        提交出库单
      </nut-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppNavBar from '@/components/AppNavBar.vue'
import { usePageData } from '@/composables/usePageData'

const uiText_8598ae = '当前无可售数'
const uiText_9f31dd = '暂无出库项，请从商品列表批量选择后进入'
const uiText_dac8d4 = '已选商品，请用计数器设置出库数量（不可超过当前可售数）'

const {
  lines,
  submitting,
  bumpQuantity,
  setQuantity,
  submit,
} = usePageData()

const readyCount = computed(
  () =>
    lines.value.filter((line) => line.currentStock > 0 && line.quantity > 0).length,
)

function onQtyInput(lineKey: string, event: { detail: { value: string } }) {
  const value = parseInt(event.detail.value, 10)
  setQuantity(lineKey, Number.isNaN(value) ? 0 : value)
}
</script>

<style lang="less">
.page-stock-out {
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
    opacity: 0.88;
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
.line-status {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #999;
}
.line-status.ok {
  color: #667eea;
}
.line-status.warn {
  color: #e53935;
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
  &.disabled {
    opacity: 0.35;
  }
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
