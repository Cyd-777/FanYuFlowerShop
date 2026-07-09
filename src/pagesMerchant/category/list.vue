<template>
  <view class="page-category-list" id="merchant-category-list-scroll-body">
    <AppNavBar />
    <view class="intro">
      <view class="title">{{ uiText_5c2747 }}</view>
      <view class="desc">{{ uiText_02df6c }}</view>
    </view>

    <view
      v-for="section in navSections"
      :key="section.sectionId"
      class="section-card"
    >
      <view
        class="section-title"
        :class="{ clickable: section.primaryId }"
        @click="onPrimaryTap(section)"
      >
        {{ section.icon }} {{ section.title }}
        <text class="section-badge">{{ section.badge }}</text>
        <text v-if="section.primaryId" class="section-edit-hint">{{ editText }}</text>
      </view>
      <view class="section-tier">{{ uiText_2e6efa }}</view>
      <view v-if="section.desc" class="section-desc">{{ section.desc }}</view>

      <view v-if="section.secondaries.length || section.canAdd" class="secondary-block">
        <view class="secondary-label">{{ uiText_6b428a }}</view>
        <view class="pill-wrap">
          <view
            v-for="item in section.secondaries"
            :key="item._id"
            class="pill-chip"
            :class="{ readonly: section.secondaryReadOnly }"
            hover-class="pill-chip--pressed"
            @tap="onSecondaryTap(item, section.secondaryReadOnly)"
          >
            <text class="pill-label">{{ item.icon }} {{ item.name }}</text>
            <text class="pill-count">{{ item.goodsCount || 0 }}件</text>
          </view>
          <view
            v-if="section.canAdd"
            class="pill-chip pill-chip--add"
            hover-class="pill-chip--pressed"
            @tap.stop="addCategory({ type: section.addType, parentId: section.sectionId })"
          >
            <text class="pill-label">+ 添加{{ section.addLabel }}</text>
          </view>
        </view>
      </view>
      <view v-else class="section-desc">暂无二阶分类{{ section.emptyHint }}</view>
    </view>

    <ScrollListTailSpacer
      content-selector="#merchant-category-list-scroll-body"
      :watch-key="`${loading}-${categoryList.length}-${allCategoryList.length}`"
    />
  </view>
</template>

<script setup lang="ts">
import { usePageData } from '@/composables/usePageData'
import { computed } from 'vue'
import { MALL_NAV_PARENT_IDS } from '@/types/category'
import type { Category } from '@/types/category'
import { MALL_PRIMARY_NAV } from '@/utils/mallCategoryNav'
import {
  listBouquetSecondaryCategories,
  listMaterialSecondaryCategories,
  mallSecondaryCategoriesForPrimary,
} from '@/utils/mallCategoryNav'

const editText = '编辑'
const uiText_02df6c = '与商城一致：左侧为一阶 tab，顶部为二阶胶囊。点击一阶标题或二阶胶囊进入编辑；二阶可升级为一阶 tab。\n        鲜花二阶由百科品种自动衍生。'
const uiText_2e6efa = '一阶 · 左侧 tab'
const uiText_5c2747 = '分类管理'
const uiText_6b428a = '二阶 · 顶部胶囊'

interface NavSection {
  sectionId: string
  primaryId?: string
  icon: string
  title: string
  badge: string
  desc: string
  secondaries: Category[]
  secondaryReadOnly: boolean
  canAdd: boolean
  addType: string
  addLabel: string
  emptyHint: string
}

const {
  categoryList,
  allCategoryList,
  loading,
  addCategory,
  editCategory,
} = usePageData()

const customCategories = computed(() => categoryList.value)

const wikiCategories = computed(() =>
  allCategoryList.value
    .filter((item) => item._source === 'wiki')
    .sort((a, b) => (b.sort || 0) - (a.sort || 0)),
)

const navSections = computed<NavSection[]>(() => {
  const customs = customCategories.value
  const primaryCustoms = customs
    .filter((item) => item.navTier === 'primary')
    .sort((a, b) => (b.sort || 0) - (a.sort || 0))

  const fixedSections: NavSection[] = MALL_PRIMARY_NAV.map((nav) => {
    const sectionId = MALL_NAV_PARENT_IDS[nav.key]

    if (nav.key === 'flower') {
      return {
        sectionId,
        icon: nav.icon,
        title: nav.name,
        badge: '固定',
        desc: '百科词条品种自动产生二阶胶囊，无需在此维护。',
        secondaries: wikiCategories.value,
        secondaryReadOnly: true,
        canAdd: false,
        addType: '',
        addLabel: '',
        emptyHint: '（智库有品种后将自动出现）',
      }
    }

    const secondaries =
      nav.key === 'bouquet'
        ? listBouquetSecondaryCategories(customs)
        : listMaterialSecondaryCategories(customs)

    return {
      sectionId,
      icon: nav.icon,
      title: nav.name,
      badge: '固定',
      desc: '',
      secondaries,
      secondaryReadOnly: false,
      canAdd: true,
      addType: nav.key === 'material' ? 'material' : 'bouquet',
      addLabel: nav.key === 'material' ? '物料品类' : '花束场景',
      emptyHint: `，可点胶囊栏「+ 添加${nav.key === 'material' ? '物料品类' : '花束场景'}」`,
    }
  })

  const customSections: NavSection[] = primaryCustoms.map((primary) => ({
    sectionId: primary._id,
    primaryId: primary._id,
    icon: primary.icon,
    title: primary.name,
    badge: '自定义一阶',
    desc: '点击标题编辑；可在此降为二阶胶囊，其下可继续添加二阶分类。',
    secondaries: mallSecondaryCategoriesForPrimary(primary._id, customs),
    secondaryReadOnly: false,
    canAdd: true,
    addType: primary.categoryType === 'material' ? 'material' : 'bouquet',
    addLabel: primary.categoryType === 'material' ? '物料品类' : '花束场景',
    emptyHint: '，可点胶囊栏「+ 添加二阶分类」',
  }))

  return [...fixedSections, ...customSections]
})

function onPrimaryTap(section: NavSection) {
  if (!section.primaryId) return
  editCategory(section.primaryId)
}

function onSecondaryTap(item: Category, readOnly: boolean) {
  if (readOnly || item._source === 'wiki') return
  editCategory(item._id)
}
</script>

<style lang="less">
@import '@/styles/tokens.less';

.page-category-list { min-height: 100vh; padding-bottom: 48rpx; background: @color-bg-page; }
.intro { padding: 32rpx; background: #fff; margin-bottom: 16rpx; }
.intro .title { font-size: 34rpx; font-weight: 600; color: #333; }
.intro .desc { margin-top: 8rpx; font-size: 24rpx; color: #999; line-height: 1.5; }
.section-card { background: #fff; margin: 0 0 16rpx; padding: 24rpx 32rpx; }
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
.section-title.clickable { color: @color-primary; }
.section-edit-hint {
  font-size: 20rpx;
  font-weight: 400;
  color: @color-primary;
  margin-left: auto;
}
.section-tier { font-size: 20rpx; color: @color-primary; margin-bottom: 12rpx; }
.section-badge { font-size: 20rpx; color: #999; font-weight: 400; background: @color-bg-muted; padding: 2rpx 10rpx; border-radius: 8rpx; }
.section-desc { font-size: 24rpx; color: #999; line-height: 1.5; margin-bottom: 8rpx; }
.secondary-block { margin-top: 8rpx; }
.secondary-label { font-size: 22rpx; color: #bbb; margin-bottom: 12rpx; }
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
.pill-chip.readonly {
  background: @color-bg-muted;
  border-color: #eee;
  color: #666;
}
.pill-chip--pressed { opacity: 0.85; }
.pill-label { flex: none; }
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
