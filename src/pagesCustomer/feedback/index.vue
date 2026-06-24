<template>
  <view class="page-feedback">
    <AppNavBar />
    <view class="hero">
      <view class="hero-icon">🐛</view>
      <view class="hero-title">Bug 反馈</view>
      <view class="hero-desc">通过小程序自带的「反馈与投诉」提交问题，我们会尽快处理</view>
    </view>

    <view class="section">
      <view class="section-title">如何提交</view>
      <view
        v-for="(step, index) in steps"
        :key="step.title"
        class="step-item"
      >
        <view class="step-index">{{ index + 1 }}</view>
        <view class="step-body">
          <view class="step-title">{{ step.title }}</view>
          <view class="step-desc">{{ step.desc }}</view>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-title">选择反馈类型</view>
      <view class="type-card">
        <view class="type-name">功能异常</view>
        <view class="type-desc">小程序闪退、页面打不开、按钮无反应、数据错误等 Bug，请选此项</view>
      </view>
      <view class="type-card">
        <view class="type-name">产品建议</view>
        <view class="type-desc">功能想法、体验改进、文案或界面建议等，请选此项</view>
      </view>
    </view>

    <view class="section tips-section">
      <view class="section-title">填写建议</view>
      <view class="tips-text">{{ tipsText }}</view>
    </view>
  </view>
</template>

<script setup lang="ts">
const tipsText =
  '尽量写清楚：在哪个页面、做了什么操作、期望结果与实际结果。如有截图一并上传，便于我们快速定位问题。'

const steps = [
  {
    title: '打开胶囊菜单',
    desc: '点击屏幕右上角胶囊按钮右侧的「···」（三个点）',
  },
  {
    title: '进入反馈与投诉',
    desc: '在弹出菜单中选择「反馈与投诉」',
  },
  {
    title: '选择类型并提交',
    desc: '根据问题性质选择「功能异常」或「产品建议」，填写说明后提交',
  },
]
</script>

<style lang="less">
@import '@/styles/tokens.less';

.page-feedback {
  min-height: 100vh;
  background: @color-bg-page;
  padding: 16rpx;
  padding-bottom: 48rpx;
}

.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40rpx 32rpx 36rpx;
  margin-bottom: 16rpx;
  background: @color-bg-card;
  border-radius: @radius-md;
}

.hero-icon {
  font-size: 64rpx;
  line-height: 1;
}

.hero-title {
  margin-top: 16rpx;
  font-size: 34rpx;
  font-weight: 600;
  color: @color-text-primary;
}

.hero-desc {
  margin-top: 12rpx;
  font-size: 26rpx;
  line-height: 1.6;
  color: @color-text-tertiary;
  text-align: center;
}

.section {
  background: @color-bg-card;
  border-radius: @radius-md;
  padding: 24rpx 32rpx;
  margin-bottom: 16rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: @color-text-primary;
  margin-bottom: 16rpx;
}

.step-item {
  display: flex;
  align-items: flex-start;
  padding: 16rpx 0;

  &:not(:last-child) {
    border-bottom: 2rpx solid @color-border;
  }
}

.step-index {
  width: 44rpx;
  height: 44rpx;
  line-height: 44rpx;
  text-align: center;
  border-radius: 50%;
  background: @color-primary-light;
  color: @color-primary;
  font-size: 24rpx;
  font-weight: 600;
  flex-shrink: 0;
}

.step-body {
  flex: 1;
  margin-left: 20rpx;
  min-width: 0;
}

.step-title {
  font-size: 28rpx;
  font-weight: 500;
  color: @color-text-primary;
}

.step-desc {
  margin-top: 6rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: @color-text-tertiary;
}

.type-card {
  padding: 20rpx 0;

  &:not(:last-child) {
    border-bottom: 2rpx solid @color-border;
  }
}

.type-name {
  font-size: 28rpx;
  font-weight: 500;
  color: @color-text-primary;
}

.type-desc {
  margin-top: 8rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: @color-text-tertiary;
}

.tips-section .tips-text {
  font-size: 26rpx;
  line-height: 1.7;
  color: @color-text-secondary;
}
</style>
