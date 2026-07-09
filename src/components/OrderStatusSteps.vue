<template>
  <view class="order-status-steps" :class="{ cancelled: isCancelled, completed: isCompleted }">
    <view v-if="isCancelled" class="flow-tip cancelled-tip">{{ cancelledTipText }}</view>
    <view v-else-if="isCompleted" class="flow-tip completed-tip">{{ completedTipText }}</view>

    <!-- 门店步骤 -->
    <view class="steps-group">
      <view class="group-title">{{ shopGroupTitle }}</view>
      <view class="steps-row">
        <view
          v-for="(step, index) in shopSteps"
          :key="step.key"
          class="step-item"
        >
          <view class="step-track">
            <view v-if="index > 0" class="step-line" :class="{ done: isShopLineDone(index) }" />
            <view class="step-dot" :class="{ done: isShopStepDone(index), active: isShopStepActive(index) }">
              <text v-if="isShopStepDone(index)" class="step-check">✓</text>
              <text v-else class="step-num">{{ index + 1 }}</text>
            </view>
          </view>
          <text class="step-label" :class="{ done: isShopStepDone(index), active: isShopStepActive(index) }">
            {{ step.label }}
          </text>
        </view>
      </view>
    </view>

    <!-- 自配送步骤（选择自配送后显示） -->
    <view v-if="showSelfDelivery" class="steps-group delivery-group">
      <view class="group-title">{{ selfDeliveryGroupTitle }}</view>
      <view class="steps-row">
        <view
          v-for="(step, index) in selfDeliverySteps"
          :key="step.key"
          class="step-item"
        >
          <view class="step-track">
            <view v-if="index > 0" class="step-line" :class="{ done: isDeliverDone(index) }" />
            <view class="step-dot" :class="{ done: isDeliverDone(index), active: isDeliverActive(index) }">
              <text v-if="isDeliverDone(index)" class="step-check">✓</text>
              <text v-else class="step-num">{{ index + 1 }}</text>
            </view>
          </view>
          <text class="step-label" :class="{ done: isDeliverDone(index), active: isDeliverActive(index) }">
            {{ step.label }}
          </text>
        </view>
      </view>
    </view>

    <!-- 骑手配送步骤（选择骑手后显示） -->
    <view v-if="showRider" class="steps-group rider-group">
      <view class="group-title">{{ riderGroupTitle }}</view>
      <view class="steps-row">
        <view
          v-for="(step, index) in ORDER_RIDER_STEPS"
          :key="step.key"
          class="step-item"
        >
          <view class="step-track">
            <view v-if="index > 0" class="step-line" :class="{ done: isRiderLineDone(index) }" />
            <view class="step-dot" :class="{ done: isRiderStepDone(index), active: isRiderStepActive(index) }">
              <text v-if="isRiderStepDone(index)" class="step-check">✓</text>
              <text v-else class="step-num">{{ index + 1 }}</text>
            </view>
          </view>
          <text class="step-label" :class="{ done: isRiderStepDone(index), active: isRiderStepActive(index) }">
            {{ step.label }}
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { OrderStatus, RiderStatus } from '@/types/order'
import {
  ORDER_RIDER_STEPS,
  getRiderStepActiveIndex,
  getShopStepActiveIndex,
  normalizeOrderStatus,
  normalizeRiderStatus,
  shouldShowRiderSteps,
  getShopOrderStatusSteps,
  getSelfDeliveryStatusSteps,
} from '@/types/order'

const cancelledTipText = '订单已取消'
const completedTipText = '订单已完成'
const shopGroupTitle = '门店'
const selfDeliveryGroupTitle = '自配送'
const riderGroupTitle = '配送'

const props = defineProps<{
  status: OrderStatus | string
  riderStatus?: RiderStatus | string
  deliveryMethod?: string
  merchantDelivery?: string
}>()

const normalizedStatus = computed(() => normalizeOrderStatus(props.status))
const normalizedRiderStatus = computed(() => normalizeRiderStatus(props.riderStatus))

const isCancelled = computed(() => normalizedStatus.value === 'cancelled')
const isCompleted = computed(() => normalizedStatus.value === 'completed')
const isPickup = computed(() => props.deliveryMethod === 'pickup')

/** 已选择配送方案（自配送/呼叫骑手） */
const hasChosenDelivery = computed(() =>
  props.merchantDelivery === 'self' || normalizedRiderStatus.value !== 'none',
)

/** 门店步骤：配送选好前只到「备货中」；选好后完整 */
const shopSteps = computed(() => {
  if (isPickup.value) return getShopOrderStatusSteps('pickup')
  // 已选自配送/呼叫骑手：显示完整门店步骤
  if (hasChosenDelivery.value || normalizedStatus.value === 'prep_done') {
    return getShopOrderStatusSteps()
  }
  // 备货中或更早且未选配送：只显示到备货中
  return [
    { key: 'pending', label: '待处理' },
    { key: 'accepted', label: '已接单' },
    { key: 'preparing', label: '备货中' },
  ]
})

const shopActiveIndex = computed(() => {
  if (isCancelled.value) return -1
  if (isCompleted.value) return shopSteps.value.length
  // 已选配送方案：门店步骤全部完成
  if (hasChosenDelivery.value) return shopSteps.value.length
  // prep_done：门店步骤全部完成
  if (normalizedStatus.value === 'prep_done') return shopSteps.value.length
  // 自提订单：在门店步骤数组中找实际位置
  if (isPickup.value) {
    const idx = shopSteps.value.findIndex((s) => s.key === normalizedStatus.value)
    return idx >= 0 ? idx : 0
  }
  return getShopStepActiveIndex(normalizedStatus.value)
})

/** 自配送步骤 */
const showSelfDelivery = computed(() =>
  props.merchantDelivery === 'self' &&
  (normalizedStatus.value === 'delivering' || normalizedStatus.value === 'completed'),
  )
const selfDeliverySteps = computed(() => getSelfDeliveryStatusSteps())

const selfDeliveryActiveIndex = computed(() => {
  const steps = selfDeliverySteps.value
  const idx = steps.findIndex((s) => s.key === normalizedStatus.value)
  if (isCompleted.value) return steps.length
  return idx >= 0 ? idx : 0
})

function isDeliverDone(index: number) {
  if (isCancelled.value) return false
  if (isCompleted.value) return true
  return index < selfDeliveryActiveIndex.value
}

function isDeliverActive(index: number) {
  if (isCancelled.value || isCompleted.value) return false
  return index === selfDeliveryActiveIndex.value
}

/** 骑手配送步骤 */
const riderActiveIndex = computed(() => getRiderStepActiveIndex(normalizedRiderStatus.value))

const showRider = computed(() =>
  !isPickup.value
    && props.merchantDelivery !== 'self'
    && shouldShowRiderSteps(normalizedStatus.value, normalizedRiderStatus.value),
)

function isShopStepDone(index: number) {
  if (isCancelled.value) return false
  if (isCompleted.value) return true
  return index < shopActiveIndex.value
}

function isShopStepActive(index: number) {
  if (isCancelled.value || isCompleted.value) return false
  return index === shopActiveIndex.value
}

function isShopLineDone(index: number) {
  if (isCancelled.value) return false
  if (isCompleted.value) return true
  return index <= shopActiveIndex.value
}

function isRiderStepDone(index: number) {
  if (isCancelled.value) return false
  if (isCompleted.value) return true
  if (riderActiveIndex.value < 0) return false
  return index < riderActiveIndex.value
}

function isRiderStepActive(index: number) {
  if (isCancelled.value || isCompleted.value) return false
  if (riderActiveIndex.value < 0) return index === 0 && showRider.value
  return index === riderActiveIndex.value
}

function isRiderLineDone(index: number) {
  if (isCancelled.value) return false
  if (isCompleted.value) return true
  if (riderActiveIndex.value < 0) return false
  return index <= riderActiveIndex.value
}
</script>

<style lang="less">
@import '@/styles/tokens.less';
.order-status-steps { padding: 4rpx 0 0; }

.flow-tip { margin-bottom: 20rpx; text-align: center; font-size: 28rpx; font-weight: 600; }
.cancelled-tip { color: #999; }
.completed-tip { color: @color-primary; }

.steps-group + .steps-group { margin-top: 28rpx; padding-top: 24rpx; border-top: 2rpx solid @color-bg-placeholder; }

.group-title { margin-bottom: 16rpx; font-size: 22rpx; color: #bbb; letter-spacing: 2rpx; }

.steps-row { display: flex; align-items: flex-start; }
.step-item { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; }
.step-track { width: 100%; display: flex; align-items: center; justify-content: center; position: relative; height: 44rpx; }
.step-line {
  position: absolute; top: 50%; right: 50%; width: 100%; height: 4rpx; margin-top: -2rpx;
  background: @color-border-dashed; z-index: 0;
  &.done { background: @color-primary; }
}
.step-dot {
  position: relative; z-index: 1; width: 44rpx; height: 44rpx; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: @color-border-dashed; color: #999; font-size: 22rpx; font-weight: 600;
  &.done, &.active { background: @color-primary; color: #fff; }
}
.rider-group .step-dot.done, .rider-group .step-dot.active { background: @color-status-warm; }
.rider-group .step-line.done { background: @color-status-warm; }
.rider-group .step-label.done, .rider-group .step-label.active { color: @color-status-warm; }
.delivery-group .step-dot.done, .delivery-group .step-dot.active { background: @color-merchant-start; }
.delivery-group .step-line.done { background: @color-merchant-start; }
.delivery-group .step-label.done, .delivery-group .step-label.active { color: @color-merchant-start; }
.step-check { font-size: 24rpx; line-height: 1; }
.step-num { line-height: 1; }
.step-label { margin-top: 10rpx; font-size: 20rpx; color: #999; text-align: center; line-height: 1.3; max-width: 100%; word-break: keep-all; &.done, &.active { color: @color-primary; font-weight: 600; } }

.order-status-steps.cancelled {
  .step-dot, .step-line.done { background: @color-border-dashed; }
  .step-dot { color: #999; }
  .step-label.done, .step-label.active { color: #999; font-weight: 400; }
}
</style>
