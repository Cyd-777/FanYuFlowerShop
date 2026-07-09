<template>
  <view class="form-step-counter" @click.stop>
    <view
      v-for="tier in negativeTiers"
      :key="`n-${tier.step}`"
      class="tier-btn"
      @click="bump(-tier.step)"
    >
      <component :is="tier.icon" :size="iconSize" color="#666" />
    </view>
    <input
      class="counter-input"
      :type="decimal > 0 ? 'digit' : 'number'"
      :value="displayValue"
      @input="onInput"
      @blur="onBlur"
    />
    <view
      v-for="tier in positiveTiers"
      :key="`p-${tier.step}`"
      class="tier-btn"
      @click="bump(tier.step)"
    >
      <component :is="tier.icon" :size="iconSize" color="#666" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import {
  PlayDoubleBack,
  PlayDoubleForward,
  RectLeft,
  RectRight,
} from '@nutui/icons-vue-taro'

const props = withDefaults(
  defineProps<{
    modelValue: number
    min?: number
    max?: number
    /** 快捷步长，默认 5 / 10（小档单箭头，大档双箭头） */
    quickSteps?: number[]
    /** 小数位数；0 为整数 */
    decimal?: number
    iconSize?: number | string
  }>(),
  {
    min: 0,
    max: undefined,
    quickSteps: () => [5, 10],
    decimal: 0,
    iconSize: 12,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

interface TierItem {
  step: number
  icon: Component
}

const maxQuickStep = computed(() => Math.max(...props.quickSteps.filter((s) => s > 0), 0))

function pickIcon(step: number, direction: 'dec' | 'inc'): Component {
  const useDouble = props.quickSteps.length > 1 && step === maxQuickStep.value
  if (direction === 'dec') {
    return useDouble ? PlayDoubleBack : RectLeft
  }
  return useDouble ? PlayDoubleForward : RectRight
}

const negativeTiers = computed<TierItem[]>(() =>
  [...props.quickSteps]
    .filter((s) => s > 0)
    .sort((a, b) => b - a)
    .map((step) => ({ step, icon: pickIcon(step, 'dec') })),
)

const positiveTiers = computed<TierItem[]>(() =>
  [...props.quickSteps]
    .filter((s) => s > 0)
    .sort((a, b) => a - b)
    .map((step) => ({ step, icon: pickIcon(step, 'inc') })),
)

const factor = computed(() => 10 ** props.decimal)

function clamp(raw: number) {
  let next = raw
  if (Number.isNaN(next)) next = props.min
  if (props.decimal > 0) {
    next = Math.round(next * factor.value) / factor.value
  } else {
    next = Math.round(next)
  }
  if (next < props.min) next = props.min
  if (props.max != null && next > props.max) next = props.max
  return next
}

const displayValue = computed(() => {
  const v = clamp(props.modelValue)
  if (props.decimal <= 0) return String(v)
  return v.toFixed(props.decimal).replace(/\.?0+$/, '') || '0'
})

function emitValue(next: number) {
  emit('update:modelValue', clamp(next))
}

function bump(delta: number) {
  emitValue(props.modelValue + delta)
}

function onInput(event: { detail?: { value?: string } }) {
  const raw = String(event.detail?.value ?? '').trim()
  if (!raw) {
    emitValue(props.min)
    return
  }
  const parsed = props.decimal > 0 ? parseFloat(raw) : parseInt(raw, 10)
  emitValue(parsed)
}

function onBlur() {
  emitValue(props.modelValue)
}
</script>

<style lang="less">
@import '@/styles/tokens.less';
@import '@nutui/icons-vue-taro/dist/style_iconfont.css';

.form-step-counter {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: nowrap;
  gap: 6rpx;
  width: 100%;
}
.tier-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52rpx;
  height: 52rpx;
  border-radius: 12rpx;
  background: @color-bg-muted;
}
.counter-input {
  flex-shrink: 0;
  width: 96rpx;
  height: 52rpx;
  text-align: center;
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  background: @color-bg-muted;
  border-radius: 12rpx;
}
</style>
