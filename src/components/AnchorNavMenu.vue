<template>
  <scroll-view
    :class="['anchor-nav-menu', `anchor-nav-menu--${type}`]"
    :scroll-y="type === 'primary'"
    :scroll-x="type === 'secondary'"
    :enhanced="true"
    :show-scrollbar="false"
    :scroll-into-view="scrollTargetId"
    :scroll-with-animation="true"
  >
    <view
      :class="['anchor-nav-menu__track', type === 'secondary' ? 'anchor-nav-menu__track--row' : '']"
    >
      <view
        v-for="(item, idx) in items"
        :key="item.key"
        :id="itemId(idx)"
        class="anchor-nav-menu__item"
        :class="{ 'anchor-nav-menu__item--active': idx === activeIndex }"
        hover-class="anchor-nav-menu__item--pressed"
        @tap="handleTap(idx)"
      >
        <text v-if="item.icon" class="anchor-nav-menu__icon">{{ item.icon }}</text>
        <text class="anchor-nav-menu__label">{{ item.label }}</text>
      </view>
    </view>
  </scroll-view>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'

export interface AnchorNavItem {
  key: string
  label: string
  icon?: string
}

const props = withDefaults(
  defineProps<{
    type: 'primary' | 'secondary'
    items: AnchorNavItem[]
    activeIndex: number
    uid?: string
  }>(),
  { uid: 'nav' },
)

const emit = defineEmits<{
  select: [index: number]
}>()

const scrollTargetId = ref('')

function itemId(idx: number) {
  return `anm-${props.uid}-${idx}`
}

function handleTap(idx: number) {
  scrollTargetId.value = itemId(idx)
  emit('select', idx)
}

// activeIndex 变化 → scroll-into-view（含 content scroll 触发和 tap 触发）
watch(
  () => props.activeIndex,
  (idx) => {
    if (idx >= 0 && idx < props.items.length) {
      scrollTargetId.value = itemId(idx)
    }
  },
)

// items 变化（如切 L1 tab）：DOM 渲染后设 scrollTargetId
watch(
  () => props.items.map((i) => i.key).join('|'),
  () => {
    void nextTick(() => {
      const idx = props.activeIndex
      if (idx >= 0 && idx < props.items.length) {
        scrollTargetId.value = itemId(idx)
      }
    })
  },
  { immediate: true },
)
</script>

<style lang="less">
@import '@/styles/tokens.less';

.anchor-nav-menu {
  box-sizing: border-box;

  &--primary {
    width: 100%;
    height: 100%;
    background: #fff;
  }

  &--secondary {
    width: 100%;
    height: 100%;
  }
}

.anchor-nav-menu__track--row {
  display: flex;
  flex-direction: row;
  white-space: nowrap;
  align-items: center;
  gap: 8rpx;
  padding: 10rpx 12rpx;
  box-sizing: border-box;
  height: 100%;
  width: auto;
}

.anchor-nav-menu__item {
  box-sizing: border-box;
}

.anchor-nav-menu--primary .anchor-nav-menu__item {
  padding: 28rpx 24rpx;
  font-size: 26rpx;
  color: #666;
  text-align: center;
  border-left: 4rpx solid transparent;

  &--active {
    color: @color-primary;
    border-left-color: @color-primary;
    background: @color-primary-light;
    font-weight: 600;
  }
}

.anchor-nav-menu--secondary .anchor-nav-menu__item {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  min-width: 144rpx;
  padding: 6rpx 12rpx;
  background: @color-bg-muted;
  border: 2rpx solid #eee;
  border-radius: 28rpx;
  font-size: 24rpx;
  color: #666;
  white-space: nowrap;
  line-height: 1.4;
  text-align: center;
  justify-content: center;

  &--active {
    background: @color-primary-light;
    border-color: @color-primary-border;
    color: @color-primary;
    font-weight: 600;
  }
}

.anchor-nav-menu__item--pressed {
  opacity: 0.85;
}

.anchor-nav-menu__label {
  line-height: 1.4;
}
</style>
