<template>
  <view class="page-guide">
    <AppNavBar />
    <!-- Progress indicator -->
    <view class="progress-bar">
      <view class="progress-track">
        <view class="progress-fill" :style="{ width: (currentStep / TOTAL_STEPS) * 100 + '%' }" />
      </view>
      <view class="progress-label">{{ currentStep }}/{{ TOTAL_STEPS }}</view>
    </view>

    <!-- Step container -->
    <view class="steps-container">
      <!-- Step 1: Recipient -->
      <view v-show="currentStep === 1" class="step-panel" :class="stepClass(1)">
        <view class="step-title">送花对象是谁？</view>
        <view class="pill-group">
          <view
            v-for="opt in recipientOptions"
            :key="opt"
            class="pill"
            :class="{ active: form.recipient === opt }"
            @click="form.recipient = opt"
          >
            {{ opt }}
          </view>
        </view>
        <view class="step-footer">
          <view class="btn-placeholder" />
          <nut-button type="primary" :disabled="!form.recipient" @click="nextStep">
            下一步
          </nut-button>
        </view>
      </view>

      <!-- Step 2: Occasion -->
      <view v-show="currentStep === 2" class="step-panel" :class="stepClass(2)">
        <view class="step-title">什么场合需要？</view>
        <view class="pill-group">
          <view
            v-for="opt in occasionOptions"
            :key="opt"
            class="pill"
            :class="{ active: form.occasion === opt }"
            @click="form.occasion = opt"
          >
            {{ opt }}
          </view>
        </view>
        <view class="step-footer">
          <view class="btn-back" @click="prevStep">上一步</view>
          <nut-button type="primary" :disabled="!form.occasion" @click="nextStep">
            下一步
          </nut-button>
        </view>
      </view>

      <!-- Step 3: Budget -->
      <view v-show="currentStep === 3" class="step-panel" :class="stepClass(3)">
        <view class="step-title">预算范围是多少？</view>
        <view class="pill-group">
          <view
            v-for="opt in budgetOptions"
            :key="opt.label"
            class="pill"
            :class="{ active: form.budget === opt.value }"
            @click="form.budget = opt.value"
          >
            {{ opt.label }}
          </view>
        </view>
        <view class="step-footer">
          <view class="btn-back" @click="prevStep">上一步</view>
          <nut-button type="primary" :disabled="form.budget == null" @click="nextStep">
            下一步
          </nut-button>
        </view>
      </view>

      <!-- Step 4: Preference -->
      <view v-show="currentStep === 4" class="step-panel" :class="stepClass(4)">
        <view class="step-title">是否查看成品花束？</view>
        <view class="pill-group">
          <view
            class="pill"
            :class="{ active: preferReadyMade === true }"
            @click="preferReadyMade = true"
          >是，只看成品花束</view>
          <view
            class="pill"
            :class="{ active: preferReadyMade === false }"
            @click="preferReadyMade = false"
          >都看看，不限制</view>
        </view>
        <view class="step-footer">
          <view class="btn-back" @click="prevStep">上一步</view>
          <nut-button type="primary" @click="onComplete">完成，看看推荐</nut-button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { navigateTo } from '@/utils/router'
import AppNavBar from '@/components/AppNavBar.vue'

const TOTAL_STEPS = 4

const currentStep = ref(1)
const direction = ref<'forward' | 'backward'>('forward')

const recipientOptions = ['恋人', '朋友', '家人', '老师', '领导', '其他']
const occasionOptions = ['生日', '节日', '道歉', '探病', '毕业', '其他']
const budgetOptions = [
  { label: '100元以内', value: 100 },
  { label: '100-200元', value: 200 },
  { label: '200-500元', value: 500 },
  { label: '500元以上', value: 501 },
]

const form = reactive({
  recipient: '',
  occasion: '',
  budget: null as number | null,
})

const preferReadyMade = ref(false)

function stepClass(step: number) {
  if (step === currentStep.value) {
    return direction.value === 'forward' ? 'step-enter-right' : 'step-enter-left'
  }
  return ''
}

function nextStep() {
  if (currentStep.value < TOTAL_STEPS) {
    direction.value = 'forward'
    currentStep.value++
  }
}

function prevStep() {
  if (currentStep.value > 1) {
    direction.value = 'backward'
    currentStep.value--
  }
}

function onComplete() {
  const params = new URLSearchParams()
  if (form.recipient) params.set('recipient', form.recipient)
  if (form.occasion) params.set('occasion', form.occasion)
  if (form.budget != null) params.set('budget', String(form.budget))
  params.set('preferReadyMade', preferReadyMade.value ? '1' : '0')
  navigateTo({ url: `/pagesCustomer/guide/result?${params.toString()}` })
}
</script>

<style lang="less">
@import '@/styles/tokens.less';
.page-guide {
  min-height: 100vh;
  background: @color-bg-page;
  display: flex;
  flex-direction: column;
}

.progress-bar {
  padding: 32rpx 32rpx 16rpx;
  display: flex;
  align-items: center;
}

.progress-track {
  flex: 1;
  height: 8rpx;
  background: @color-border-dashed;
  border-radius: 4rpx;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: @color-primary;
  border-radius: 4rpx;
  transition: width 0.3s ease;
}

.progress-label {
  margin-left: 16rpx;
  font-size: 26rpx;
  color: #999;
  font-weight: 500;
  min-width: 4em;
  text-align: right;
}

.steps-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.step-panel {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  padding: 48rpx 32rpx;
  transition: transform 0.35s ease, opacity 0.35s ease;
}

.step-enter-right {
  animation: slide-in-right 0.35s ease forwards;
}

.step-enter-left {
  animation: slide-in-left 0.35s ease forwards;
}

@keyframes slide-in-right {
  from {
    transform: translateX(80rpx);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slide-in-left {
  from {
    transform: translateX(-80rpx);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.step-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 40rpx;
}

.pill-group {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.pill {
  padding: 20rpx 36rpx;
  background: #fff;
  border: 2rpx solid @color-border-dashed;
  border-radius: 48rpx;
  font-size: 28rpx;
  color: #666;
  transition: all 0.2s ease;
}

.pill.active {
  background: @color-primary-light;
  border-color: @color-primary;
  color: @color-primary;
  font-weight: 500;
}

.step-footer {
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx 0;
}

.btn-placeholder {
  width: 120rpx;
}

.btn-back {
  font-size: 28rpx;
  color: #999;
  padding: 16rpx 0;
}
</style>
