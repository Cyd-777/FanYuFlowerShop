<template>
  <view class="page-wiki-detail">
    <AppNavBar />
    <view v-if="loading" class="loading-wrap">
      <nut-skeleton rows="8" animated />
    </view>

    <scroll-view
      v-else-if="wiki"
      class="wiki-scroll"
      :scroll-y="true"
      :scroll-into-view="scrollIntoView"
      scroll-with-animation
      :enhanced="true"
      :show-scrollbar="false"
    >
      <WikiDetailHero :wiki="wiki" />

      <view class="section-shell surface-card">
        <WikiDetailContent
          v-model="activeTab"
          :wiki="wiki"
          :highlight-anchor="highlightAnchor"
          @update:model-value="switchTab"
        />
      </view>

      <view class="cloud-footnote">智库 ID：{{ wiki._id }}</view>
    </scroll-view>

    <nut-empty v-else :description="notFoundText" />
  </view>
</template>

<script setup lang="ts">
import { usePageData } from '@/composables/usePageData'
import WikiDetailContent from '@/components/wiki/WikiDetailContent.vue'
import WikiDetailHero from '@/components/wiki/WikiDetailHero.vue'

const {
  notFoundText,
  activeTab,
  loading,
  wiki,
  scrollIntoView,
  highlightAnchor,
  switchTab,
} = usePageData()
</script>

<style lang="less">
.page-wiki-detail {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f8f8f8;
  overflow-x: hidden;
  box-sizing: border-box;
}
.loading-wrap {
  padding: 24rpx;
}
.wiki-scroll {
  flex: 1;
  height: 0;
}
.section-shell {
  margin: 0 24rpx;
  padding: 24rpx;
}
.cloud-footnote {
  margin: 24rpx;
  padding-bottom: 48rpx;
  text-align: center;
  font-size: 20rpx;
  color: #bbb;
  word-break: break-all;
}
</style>
