<template>
  <view class="order-status-steps" :class="{ cancelled: isCancelled, completed: isCompleted }">
    <view v-if="isCancelled" class="flow-tip cancelled-tip">订单已取消</view>
    <view v-else-if="isCompleted" class="flow-tip completed-tip">订单已完成</view>

    <view class="steps-group">
      <view class="group-title">门店</view>
      <view class="steps-row">
        <view
          v-for="(step, index) in ORDER_SHOP_STEPS"
          :key="step.key"
          class="step-item"
        >
          <view class="step-track">
            <view
              v-if="index > 0"
              class="step-line"
              :class="{ done: isShopLineDone(index) }"
            />
            <view
              class="step-dot"
              :class="{
                done: isShopStepDone(index),
                active: isShopStepActive(index),
              }"
            >
              <text v-if="isShopStepDone(index)" class="step-check">✓</text>
              <text v-else class="step-num">{{ index + 1 }}</text>
            </view>
          </view>
          <text
            class="step-label"
            :class="{
              done: isShopStepDone(index),
              active: isShopStepActive(index),
            }"
          >
            {{ step.label }}
          </text>
        </view>
      </view>
    </view>

    <view v-if="showRider" class="steps-group rider-group">
      <view class="group-title">配送</view>
      <view class="steps-row">
        <view
          v-for="(step, index) in ORDER_RIDER_STEPS"
          :key="step.key"
          class="step-item"
        >
          <view class="step-track">
            <view
              v-if="index > 0"
              class="step-line"
              :class="{ done: isRiderLineDone(index) }"
            />
            <view
              class="step-dot"
              :class="{
                done: isRiderStepDone(index),
                active: isRiderStepActive(index),
              }"
            >
              <text v-if="isRiderStepDone(index)" class="step-check">✓</text>
              <text v-else class="step-num">{{ index + 1 }}</text>
            </view>
          </view>
          <text
            class="step-label"
            :class="{
              done: isRiderStepDone(index),
              active: isRiderStepActive(index),
            }"
          >
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
  ORDER_SHOP_STEPS,
  getRiderStepActiveIndex,
  getShopStepActiveIndex,
  normalizeOrderStatus,
  normalizeRiderStatus,
  shouldShowRiderSteps,
} from '@/types/order'

const props = defineProps<{
  status: OrderStatus | string
  riderStatus?: RiderStatus | string
}>()

const normalizedStatus = computed(() => normalizeOrderStatus(props.status))
const normalizedRiderStatus = computed(() => normalizeRiderStatus(props.riderStatus))

const shopActiveIndex = computed(() => getShopStepActiveIndex(normalizedStatus.value))
const riderActiveIndex = computed(() => getRiderStepActiveIndex(normalizedRiderStatus.value))

const isCancelled = computed(() => normalizedStatus.value === 'cancelled')
const isCompleted = computed(() => normalizedStatus.value === 'completed')
const showRider = computed(() =>
  shouldShowRiderSteps(normalizedStatus.value, normalizedRiderStatus.value),
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
.order-status-steps {
  padding: 4rpx 0 0;
}

.flow-tip {
  margin-bottom: 20rpx;
  text-align: center;
  font-size: 28rpx;
  font-weight: 600;
}

.cancelled-tip {
  color: #999;
}

.completed-tip {
  color: #e53935;
}

.steps-group + .steps-group {
  margin-top: 28rpx;
  padding-top: 24rpx;
  border-top: 2rpx solid #f0f0f0;
}

.group-title {
  margin-bottom: 16rpx;
  font-size: 22rpx;
  color: #bbb;
  letter-spacing: 2rpx;
}

.steps-row {
  display: flex;
  align-items: flex-start;
}

.step-item {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.step-track {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  height: 44rpx;
}

.step-line {
  position: absolute;
  top: 50%;
  right: 50%;
  width: 100%;
  height: 4rpx;
  margin-top: -2rpx;
  background: #e0e0e0;
  z-index: 0;

  &.done {
    background: #e53935;
  }
}

.step-dot {
  position: relative;
  z-index: 1;
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e0e0e0;
  color: #999;
  font-size: 22rpx;
  font-weight: 600;

  &.done,
  &.active {
    background: #e53935;
    color: #fff;
  }
}

.rider-group .step-dot.done,
.rider-group .step-dot.active {
  background: #ff7043;
}

.rider-group .step-line.done {
  background: #ff7043;
}

.rider-group .step-label.done,
.rider-group .step-label.active {
  color: #ff7043;
}

.step-check {
  font-size: 24rpx;
  line-height: 1;
}

.step-num {
  line-height: 1;
}

.step-label {
  margin-top: 10rpx;
  font-size: 20rpx;
  color: #999;
  text-align: center;
  line-height: 1.3;
  max-width: 100%;
  word-break: keep-all;

  &.done,
  &.active {
    color: #e53935;
    font-weight: 600;
  }
}

.order-status-steps.cancelled {
  .step-dot,
  .step-line.done {
    background: #e0e0e0;
  }

  .step-dot {
    color: #999;
  }

  .step-label.done,
  .step-label.active {
    color: #999;
    font-weight: 400;
  }
}
</style>
