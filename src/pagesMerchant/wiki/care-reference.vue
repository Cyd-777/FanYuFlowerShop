<template>
  <view class="page-wiki-care-ref" id="wiki-care-ref-scroll-body">
    <AppNavBar />
    <view class="intro">
      <view class="intro-title">{{ pageTitle }}</view>
      <view class="intro-desc">{{ pageDesc }}</view>
    </view>

    <view class="demo-card">
      <view class="demo-title">{{ demoTitle }}</view>
      <view class="demo-desc">{{ demoDesc }}</view>
      <WikiCareTrimGuide
        :angle="45"
        trim-note="斜剪 45° 增加吸水面积"
        position-note="切口保持在水面以上；去除可能浸没在水中的下段叶片"
        :water-ratio="1 / 3"
      />
    </view>

    <view
      v-for="section in catalog"
      :key="section.id"
      class="section-card"
    >
      <view class="section-head">
        <view class="section-title">{{ section.title }}</view>
        <view v-if="section.subtitle" class="section-subtitle">{{ section.subtitle }}</view>
      </view>
      <WikiCareReferenceRow
        v-for="item in section.items"
        :key="item.id"
        :item="item"
      />
    </view>

    <ScrollListTailSpacer content-selector="#wiki-care-ref-scroll-body" />
  </view>
</template>

<script setup lang="ts">
import WikiCareReferenceRow from '@/components/wiki/WikiCareReferenceRow.vue'
import WikiCareTrimGuide from '@/components/wiki/WikiCareTrimGuide.vue'
import { WIKI_CARE_CATALOG } from '@/utils/wikiCareCatalog'

const pageTitle = '养护图示说明'
const pageDesc = '顾客端百科详情 · 养护 Tab 所用图示与字段对照；维护词条时可参考。'
const demoTitle = '修剪示意'
const demoDesc = '角度与位置合并：红虚线从垂直逆时针旋转；「水上」标记切口位置；水位线示修剪高度参考。'

const catalog = WIKI_CARE_CATALOG
</script>

<style lang="less">
@import '@/styles/tokens.less';
.page-wiki-care-ref {
  min-height: 100vh;
  padding-bottom: 48rpx;
  background: @color-bg-page;
}

.intro {
  padding: 32rpx;
  background: #fff;
  margin-bottom: 16rpx;
}

.intro-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #333;
}

.intro-desc {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #999;
  line-height: 1.55;
}

.demo-card {
  margin: 0 0 16rpx;
  padding: 24rpx 32rpx;
  background: #fff;
}

.demo-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}

.demo-desc {
  margin: 6rpx 0 16rpx;
  font-size: 22rpx;
  color: #999;
  line-height: 1.5;
}

.section-card {
  background: #fff;
  margin-bottom: 16rpx;
  padding: 8rpx 32rpx 16rpx;
}

.section-head {
  padding: 16rpx 0 8rpx;
  border-bottom: 1rpx solid @color-bg-muted;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}

.section-subtitle {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #bbb;
  line-height: 1.45;
}
</style>
