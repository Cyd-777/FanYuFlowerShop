<template>
  <view class="page-merchant-wiki" id="merchant-wiki-scroll-body">
    <AppNavBar />
    <view class="intro">
      <view class="title">{{ uiText_dc1831 }}</view>
      <view class="desc">{{ uiText_2d66bb }}</view>
      <view class="intro-link" hover-class="intro-link--active" @tap="goCareReference">
        <text class="intro-link__icon">📐</text>
        <view class="intro-link__text">
          <view class="intro-link__title">{{ careRefLinkTitle }}</view>
          <view class="intro-link__desc">{{ careRefLinkDesc }}</view>
        </view>
        <text class="intro-link__arrow">›</text>
      </view>
    </view>

    <view
      v-for="section in wikiSections"
      :key="section.kindName"
      class="section-card"
    >
      <view
        class="section-title"
        :class="{ clickable: section.kindEntryId }"
        @click="onKindTap(section)"
      >
        {{ section.icon }} {{ section.kindName }}
        <text class="section-badge">{{ kindLabelText }}</text>
        <text v-if="section.kindEntryId" class="section-edit-hint">{{ uiText_018790 }}</text>
      </view>
      <view class="section-tier">{{ uiText_c9d3ca }}</view>
      <view v-if="!section.kindEntryId" class="section-desc">{{ uiText_21671c }}</view>

      <view class="secondary-block">
        <view class="secondary-label">{{ uiText_f8d652 }}</view>
        <view class="pill-wrap">
          <view
            v-for="item in section.varieties"
            :key="item._id"
            class="pill-chip"
            hover-class="pill-chip--pressed"
            @tap="editWiki(item._id)"
          >
            <text class="pill-label">{{ item.icon }} {{ displayVarietyName(item) }}</text>
            <text class="pill-count">{{ item.enabled !== false ? '已启用' : '已停用' }}</text>
          </view>
          <view
            class="pill-chip pill-chip--add"
            hover-class="pill-chip--pressed"
            @tap.stop="addVariety(section.kindName, section.icon)"
          >
            <text class="pill-label">+ 添加品种</text>
          </view>
        </view>
        <view v-if="!section.varieties.length" class="section-desc section-desc--inline">{{ uiText_070146 }}</view>
      </view>
    </view>

    <view class="section-card">
      <view class="secondary-block">
        <view class="secondary-label">{{ createActionText }}</view>
        <view class="pill-wrap">
          <view
            class="pill-chip pill-chip--add"
            hover-class="pill-chip--pressed"
            @tap="addKind"
          >
            <text class="pill-label">+ 新建种类</text>
          </view>
        </view>
      </view>
    </view>

    <nut-empty v-if="!loading && !wikiSections.length" description="暂无词条，可新建种类" />

    <ScrollListTailSpacer
      content-selector="#merchant-wiki-scroll-body"
      :watch-key="`${loading}-${wikiSections.length}-${wikis.length}`"
    />
  </view>
</template>

<script setup lang="ts">
import { usePageData } from '@/composables/usePageData'
import { navigateTo } from '@/utils/router'
import type { WikiNavSection } from '@/data/pages/merchantWikiList'

const createActionText = '新建'
const kindLabelText = '种类'
const careRefLinkTitle = '养护图示说明'
const careRefLinkDesc = '剪根方式、加水、环境条件与字段对照'
const uiText_018790 = '编辑种类词条'
const uiText_070146 = '暂无品种词条'
const uiText_21671c = '暂无种类级词条，可在下方添加品种时一并维护。'
const uiText_2d66bb = '与分类管理一致：每种花卉为一阶「种类」，其下品种为二阶胶囊。点击种类标题或品种胶囊进入编辑；新建品种后自动出现在商品分类（支/组）。'
const uiText_c9d3ca = '一阶 · 种类'
const uiText_dc1831 = '智库维护'
const uiText_f8d652 = '二阶 · 品种'

const {
  wikis,
  wikiSections,
  loading,
  editWiki,
  addVariety,
  addKind,
  displayVarietyName,
} = usePageData()

function onKindTap(section: WikiNavSection) {
  if (!section.kindEntryId) return
  editWiki(section.kindEntryId)
}

function goCareReference() {
  navigateTo({ url: '/pagesMerchant/wiki/care-reference' })
}
</script>

<style lang="less">
@import '@/styles/tokens.less';

.page-merchant-wiki {
  min-height: 100vh;
  padding-bottom: 48rpx;
  background: @color-bg-page;
}

.intro {
  padding: 32rpx;
  background: #fff;
  margin-bottom: 16rpx;
}

.intro .title {
  font-size: 34rpx;
  font-weight: 600;
  color: #333;
}

.intro .desc {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #999;
  line-height: 1.5;
}

.intro-link {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 20rpx;
  padding: 20rpx;
  background: @color-primary-bg-alt;
  border: 1rpx solid @color-danger-bg-alt;
  border-radius: 12rpx;
}

.intro-link--active {
  opacity: 0.85;
}

.intro-link__icon {
  flex-shrink: 0;
  font-size: 36rpx;
  line-height: 1;
}

.intro-link__text {
  flex: 1;
  min-width: 0;
}

.intro-link__title {
  font-size: 26rpx;
  font-weight: 600;
  color: @color-primary;
}

.intro-link__desc {
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #999;
  line-height: 1.4;
}

.intro-link__arrow {
  flex-shrink: 0;
  font-size: 36rpx;
  color: #ccc;
}

.section-card {
  background: #fff;
  margin: 0 0 16rpx;
  padding: 24rpx 32rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 4rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex-wrap: wrap;
}

.section-title.clickable {
  color: @color-primary;
}

.section-edit-hint {
  font-size: 20rpx;
  font-weight: 400;
  color: @color-primary;
  margin-left: auto;
}

.section-tier {
  font-size: 20rpx;
  color: @color-primary;
  margin-bottom: 12rpx;
}

.section-badge {
  font-size: 20rpx;
  color: #999;
  font-weight: 400;
  background: @color-bg-muted;
  padding: 2rpx 10rpx;
  border-radius: 8rpx;
}

.section-desc {
  font-size: 24rpx;
  color: #999;
  line-height: 1.5;
  margin-bottom: 8rpx;
}

.section-desc--inline {
  margin-top: 8rpx;
  margin-bottom: 0;
}

.secondary-block {
  margin-top: 8rpx;
}

.secondary-label {
  font-size: 22rpx;
  color: #bbb;
  margin-bottom: 12rpx;
}

.pill-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.pill-chip {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 10rpx 18rpx;
  background: @color-bg-muted;
  border: 2rpx solid #eee;
  border-radius: 28rpx;
  font-size: 24rpx;
  color: #666;
  line-height: 1.4;
  max-width: 100%;
  box-sizing: border-box;
}

.pill-chip--pressed {
  opacity: 0.85;
}

.pill-label {
  flex: none;
}

.pill-count {
  flex: none;
  font-size: 20rpx;
  color: #999;
  white-space: nowrap;
}

.pill-chip--add {
  border-style: dashed;
  border-color: @color-primary-border;
  color: @color-primary;
  background: @color-primary-light;
  font-weight: 500;
}
</style>
