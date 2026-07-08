<template>
  <view class="page-category page-nav-overlay-safe" :style="navCssVars">
    <AppNavBar />
    <view
      id="category-scroll-anchor"
      class="search-bar page-sticky-search"
      :class="{ 'search-modal-host-open': searchModalHostOpen }"
      :style="navSearchStickyStyle"
    >
      <AppSearchInput
        v-model="keyword"
        :placeholder="searchPlaceholder"
        :suggest-title="suggestTitle"
        :suggest="unifiedSuggest"
        history-profile="customer-unified"
        history-dual-channel
        :sticky="false"
        sticky-bleed="24rpx"
        @search="onSearchKeyword"
        @select-channel="onPickSearchChannel"
        @select="onPickSuggestion"
        @focus-change="onSearchModalOpen"
      />
    </view>

    <view class="panels" :style="panelsStyle">
      <!-- 一阶：左侧 tab 栏 -->
      <ScrollAnchorNavShell layer="l1-tab-rail" root-class="left-wrap" :style="leftWrapStyle">
        <AnchorNavMenu
          type="primary"
          :items="primaryItems"
          :active-index="primaryActiveIndex"
          uid="l1"
          @select="switchSideTab"
        />
      </ScrollAnchorNavShell>

      <!-- 一阶：右侧 scroll 区域 -->
      <ScrollAnchorNavShell
        layer="l1-scroll"
        root-class="right-wrap"
        :style="rightWrapStyle"
      >
        <!-- 二阶：胶囊 tab 栏 -->
        <ScrollAnchorNavShell
          v-if="anySectionHasSecondaryPills"
          v-show="showSecondaryPill"
          layer="l2-pill"
          root-class="pill-bar"
          :class="{ expanded: pillBarExpanded }"
          :style="pillBarBoxStyle"
          @tap.stop
          @touchmove.stop
        >
          <view class="pill-body" @tap.stop @touchmove.stop>
            <AnchorNavMenu
              v-if="!pillBarExpanded"
              type="secondary"
              :items="secondaryTabs"
              :active-index="secondaryActiveIndex"
              uid="l2"
              @select="onPillTap"
            />
            <view v-else id="category-pill-track-expanded" class="pill-track-expanded">
              <view
                v-for="(p, idx) in secondaryTabs"
                :key="p.key"
                class="pill-item"
                :class="{ active: p.key === activeSecondaryKey }"
                :data-index="idx"
                hover-class="pill-item--pressed"
                @tap.stop="onPillTap(idx)"
              >{{ p.icon }} {{ p.label }}</view>
              <view class="pill-expand-collapse-row" @tap.stop="togglePillBar">
                <view class="pill-expand-collapse">
                  <text class="pill-expand-collapse__text">收起</text>
                  <AppIcon type="三角上" :size="14" />
                </view>
              </view>
            </view>
          </view>
          <view
            v-if="showPillDropdown && pillCollapsed"
            class="pill-dropdown"
            hover-class="pill-dropdown--pressed"
            @tap.stop="togglePillBar"
          >
            <AppIcon
              class="pill-dropdown-icon"
              :type="pillCollapsed ? '三角下' : '三角上'"
              :size="16"
            />
          </view>
        </ScrollAnchorNavShell>

        <scroll-view
          id="category-content-scroll"
          class="right"
          :scroll-y="true"
          :enhanced="true"
          :bounces="false"
          :show-scrollbar="false"
          :scroll-with-animation="true"
          :scroll-into-view="contentScrollIntoView"
          :style="contentScrollStyle"
          @scroll="onRightScroll"
          @touchstart="onContentTouchStart"
          @touchmove="onContentTouchMove"
          @touchend="onContentTouchEnd"
          @touchcancel="onContentTouchCancel"
        >
          <view class="content-pull-wrap" :style="pullRefresh?.contentPullWrapStyle" @transitionend="pullRefresh?.onPullWrapTransitionEnd">
            <ScrollAnchorNavShell layer="l1-content" root-class="right-inner">
              <view id="category-list-body">
                <GoodsCardSkeleton v-if="loading" variant="row" :count="5" />
                <template v-else>
                  <view
                    v-for="(section, sIdx) in mallSections"
                    :key="section.primaryAnchorId"
                    class="primary-section"
                    :style="sIdx === mallSections.length - 1 ? { minHeight: `${lastSectionMinHeightPx}px` } : undefined"
                  >
                    <ScrollAnchorNavShell
                      v-if="secondaryPillBarActiveAt(section.tabIndex)"
                      layer="l2-pill-spacer"
                      root-class="pill-bar-scroll-spacer"
                      :style="pillBarScrollSpacerStyle"
                      aria-hidden="true"
                    />
                    <view
                      :id="section.primaryAnchorId"
                      class="primary-section-header"
                    >{{ section.icon }} {{ section.name }}</view>

                    <ScrollAnchorSection>
                      <!-- 花束：自选花束为分区固定内容，逻辑上等同特殊商品，不组件化 -->
                      <view
                        v-if="section.tabKey === 'bouquet'"
                        id="cat-customize-entry"
                        class="customize-panel"
                      >
                        <view class="customize-title">{{ customizeTitle }}</view>
                        <view class="customize-desc">{{ customizeDesc }}</view>
                        <nut-button type="primary" @tap="goCustomize">{{ customizeActionText }}</nut-button>
                      </view>

                      <template v-if="section.groups.length">
                        <view
                          v-for="group in section.groups"
                          :key="group.anchorId"
                          :id="group.anchorId"
                          class="goods-group"
                        >
                          <view v-if="!group.hideAnchor" class="group-anchor">{{ group.icon }} {{ group.title }}</view>
                          <view
                            v-for="item in group.items"
                            :key="item._id"
                            class="goods-item"
                            :class="{ 'is-sold-out': item.stock <= 0 }"
                            @tap="goDetail(item._id, item.previewUrl, item.coverImage || item.images?.[0])"
                          >
                            <view class="thumb-wrap">
                              <GoodsImage
                                :preview-src="item.previewUrl"
                                :cloud-file-id="item.coverImage || item.images?.[0]"
                                root-class="thumb"
                              />
                              <GoodsSoldOutBadge :stock="item.stock" :on-sale="item.onSale" />
                            </view>
                            <view class="info">
                              <view class="name">{{ item.name }}</view>
                              <GoodsSalesTagRow :goods="item" compact />
                              <GoodsPriceLabel :price="item.price" :unit="item.unit" root-class="price" />
                            </view>
                          </view>
                        </view>
                      </template>
                    </ScrollAnchorSection>
                    <ScrollListTailSpacer
                      v-if="sIdx === mallSections.length - 1"
                      content-selector="#category-list-body"
                      scroll-container-selector="#category-content-scroll"
                      tab-bar
                      :watch-key="categoryTailWatchKey"
                    />
                  </view>
                  <view v-if="!mallSections.length" class="empty-tip">{{ emptyText }}</view>
                </template>
              </view>
            </ScrollAnchorNavShell>
          </view>
        </scroll-view>
      </ScrollAnchorNavShell>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, nextTick, watch } from 'vue'
import Taro from '@tarojs/taro'
import { usePageData } from '@/composables/usePageData'
import { mergeTouchHandlers } from '@/composables/usePullRefresh'
import { useScrollAreaBelow } from '@/composables/useScrollAreaBelow'
import { useMallCategoryScrollLink } from '@/composables/useMallCategoryScrollLink'
import { estimateTagChipWidthRpx } from '@/composables/useScrollXTrack'
import { rpxToPx } from '@/composables/usePageSticky'
import GoodsCardSkeleton from '@/components/GoodsCardSkeleton.vue'
import GoodsImage from '@/components/GoodsImage.vue'
import GoodsSalesTagRow from '@/components/GoodsSalesTagRow.vue'
import GoodsSoldOutBadge from '@/components/GoodsSoldOutBadge.vue'
import GoodsPriceLabel from '@/components/GoodsPriceLabel.vue'
import AppSearchInput from '@/components/AppSearchInput.vue'
import AppIcon from '@/components/AppIcon.vue'
import ScrollAnchorNavShell from '@/components/ScrollAnchorNavShell.vue'
import ScrollAnchorSection from '@/components/ScrollAnchorSection.vue'
import AnchorNavMenu from '@/components/AnchorNavMenu.vue'
import { useNavBarLayout } from '@/composables/useNavBarLayout'
import { usePageSticky } from '@/composables/usePageSticky'
import { useCartTabBadgeSync } from '@/composables/useCartTabBadgeSync'
import type { ScrollAnchorTab } from '@/types/scrollAnchorNav'
import type { MallPrimarySection } from '@/utils/mallCategoryNav'
import { searchModalHostOpen } from '@/utils/searchModalHost'

const { cssVars: navCssVars } = useNavBarLayout()
const { navSearchStickyStyle } = usePageSticky()
useCartTabBadgeSync()

const customizeTitle = '✨ 自选花束'
const customizeDesc =
  '花材为所有按支售卖的商品；包装与贺卡从对应分类中选择，填写留言后提交订单。'
const customizeActionText = '开始定制'

const LEFT_WIDTH_RPX = 180
const PILL_BAR_HEIGHT_RPX = 80
const PILL_DROPDOWN_WIDTH_RPX = 72
const PILL_BODY_PAD_RPX = 24
const maxPillsInCollapsedRow = 4
const SCROLL_SELECTOR = '#category-content-scroll'

const { topPx, heightPx } = useScrollAreaBelow('#category-scroll-anchor')
const {
  keyword,
  searchPlaceholder,
  emptyText,
  loading,
  sideTabs,
  mallSections,
  unifiedSuggest,
  suggestTitle,
  setActiveTabIndex,
  goCustomize,
  onSearchKeyword,
  onPickSearchChannel,
  onPickSuggestion,
  onSearchModalOpen,
  goDetail,
  browseTouchHandlers,
  pullRefresh,
} = usePageData()

const contentTouchHandlers = mergeTouchHandlers(pullRefresh?.contentPullHandlers, browseTouchHandlers)

function onContentTouchStart(event: unknown) {
  contentTouchHandlers.onTouchStart?.(event)
}

function onContentTouchMove(event: unknown) {
  contentTouchHandlers.onTouchMove?.(event)
}

function onContentTouchEnd(event: unknown) {
  contentTouchHandlers.onTouchEnd?.(event)
}

function onContentTouchCancel(event: unknown) {
  contentTouchHandlers.onTouchCancel?.(event)
}

/** 当前一阶是否应显示胶囊栏（二阶分类 ≥2 种） */
function sectionShowsPillBar(section: MallPrimarySection): boolean {
  return section.showSecondaryPillBar
}

/** 与 sideTabs 下标对齐的一阶 mall 分区 */
function mallSectionAt(tabIndex: number) {
  return mallSections.value.find((s) => s.tabIndex === tabIndex) ?? mallSections.value[tabIndex]
}

const pillRowHeightPx = computed(() => rpxToPx(PILL_BAR_HEIGHT_RPX))

/** 全量二阶锚点（带 scope）；测量一次、各分区独立 scope 联动 */
const allSecondaryTabs = computed<ScrollAnchorTab[]>(() =>
  mallSections.value.flatMap((section) => {
    if (!section.showSecondaryPillBar) return []
    return section.groups
      .filter((g) => !g.hideAnchor && g.title)
      .map((g) => ({
        key: g.anchorId,
        label: g.title,
        icon: g.icon,
        anchorId: g.anchorId,
        scopeIndex: section.tabIndex,
      }))
  }),
)

/** 当前一阶 tab 是否应显示二阶胶囊栏（二阶分类 ≥2 种；一阶/二阶联动共用） */
function secondaryPillBarActiveAt(tabIndex: number): boolean {
  const section = mallSectionAt(tabIndex)
  if (!sectionShowsPillBar(section)) return false
  return allSecondaryTabs.value.filter((t) => t.scopeIndex === tabIndex).length >= 2
}

const {
  primaryActiveIndex,
  secondaryActiveIndex,
  contentScrollIntoView,
  onContentScroll,
  clickPrimaryTab,
  clickSecondaryTab,
  remeasure: remeasureScrollLink,
} = useMallCategoryScrollLink({
  scrollSelector: SCROLL_SELECTOR,
  sections: mallSections,
  secondaryOffsetPx: computed(() => showSecondaryPill.value ? pillRowHeightPx.value : 0),
  contentWatchKey: () =>
    `${loading.value}-${sideTabs.value.map((t) => t.key).join('|')}-${mallSections.value.map((s) => `${s.tabKey}:${s.groups.length}`).join('|')}`,
})

/** 胶囊栏展示：当前一阶 scope 下的二阶 tab */
const secondaryTabs = computed(() =>
  allSecondaryTabs.value.filter((t) => t.scopeIndex === primaryActiveIndex.value),
)

const activeSecondaryKey = computed(
  () => secondaryTabs.value[secondaryActiveIndex.value]?.key ?? '',
)

const showSecondaryPill = computed(() => secondaryPillBarActiveAt(primaryActiveIndex.value))

/** 一阶选项卡（左侧 tab 栏）选项 */
const primaryItems = computed(() =>
  sideTabs.value.map((t) => ({ key: t.key, label: t.name })),
)

watch(
  () => loading.value,
  (isLoading) => {
    if (!isLoading) {
      void nextTick(() => remeasureScrollLink())
    }
  },
)

watch([showSecondaryPill, pillRowHeightPx], () => {
  remeasureScrollLink()
})

const pillBarScrollSpacerStyle = computed(() => ({
  height: `${pillRowHeightPx.value}px`,
  minHeight: `${pillRowHeightPx.value}px`,
  width: '100%',
  flexShrink: '0',
}))

const anySectionHasSecondaryPills = computed(() =>
  mallSections.value.some((s) => sectionShowsPillBar(s)),
)

const leftWidthPx = computed(() => Math.floor((LEFT_WIDTH_RPX * Taro.getWindowInfo().windowWidth) / 750))
const pillCollapsed = ref(true)
const showPillDropdown = computed(() => secondaryTabs.value.length > maxPillsInCollapsedRow)
const pillBarExpanded = computed(() => showPillDropdown.value && !pillCollapsed.value)


watch(
  () => primaryActiveIndex.value,
  (idx) => {
    setActiveTabIndex(idx)
  },
)

function estimatePillExpandedHeightPx(): number {
  const pills = secondaryTabs.value
  if (!pills.length) return rpxToPx(PILL_BAR_HEIGHT_RPX)

  const bodyWidthPx =
    Taro.getWindowInfo().windowWidth
    - leftWidthPx.value
    - rpxToPx(PILL_DROPDOWN_WIDTH_RPX)
    - rpxToPx(PILL_BODY_PAD_RPX)
  const gapPx = rpxToPx(8)
  const rowHPx = rpxToPx(PILL_BAR_HEIGHT_RPX)
  let rowWidth = 0
  let rows = 1

  for (const pill of pills) {
    const chipPx = rpxToPx(estimateTagChipWidthRpx(pill.label, Boolean(pill.icon)))
    if (rowWidth > 0 && rowWidth + gapPx + chipPx > bodyWidthPx) {
      rows += 1
      rowWidth = chipPx
    } else {
      rowWidth = rowWidth > 0 ? rowWidth + gapPx + chipPx : chipPx
    }
  }

  return rows * rowHPx + rpxToPx(20)
}

const pillBarHeightPx = computed(() => {
  if (!showSecondaryPill.value) return 0
  if (pillBarExpanded.value) return estimatePillExpandedHeightPx()
  return pillRowHeightPx.value
})

const pillBarBoxStyle = computed(() => ({
  height: `${pillBarHeightPx.value}px`,
  minHeight: `${pillBarHeightPx.value}px`,
}))

const categoryTailWatchKey = computed(
  () =>
    `${loading.value}-${mallSections.value.length}-${mallSections.value.map((s) => s.tabKey).join('|')}`,
)

const panelsStyle = computed(() => ({ top: `${topPx.value}px`, height: `${heightPx.value}px` }))
const leftWrapStyle = computed(() => ({ width: `${leftWidthPx.value}px`, height: `${heightPx.value}px`, maxHeight: `${heightPx.value}px` }))
const rightWrapStyle = computed(() => {
  const ww = Taro.getWindowInfo().windowWidth
  return { width: `${ww - leftWidthPx.value}px`, height: `${heightPx.value}px` }
})
const contentScrollStyle = computed(() => {
  const ww = Taro.getWindowInfo().windowWidth
  return { width: `${ww - leftWidthPx.value}px`, height: `${heightPx.value}px` }
})

/** 最后一个分区 min-height = scroll-view 视口高度 - 分区标题高度。
 *  容器总高 = 标题 + min-height = scroll-view 视口高，
 *  使即使无商品也能让 header 被 scroll 到 anchor 线。 */
const LAST_SECTION_HEADER_HEIGHT_RPX = 85
const lastSectionMinHeightPx = computed(() => {
  const viewportH = heightPx.value
  if (viewportH <= 0) return 0
  return Math.max(0, viewportH)
})

function togglePillBar() {
  pillCollapsed.value = !pillCollapsed.value
  if (!pillCollapsed.value) {
    void nextTick(() => remeasureScrollLink())
  }
}

function switchSideTab(idx: number) {
  pillCollapsed.value = true
  clickPrimaryTab(idx)
}

function onPillTap(idx: number) {
  const pill = secondaryTabs.value[idx]
  if (pill) {
    clickSecondaryTab(pill.anchorId)
  }
}

function onRightScroll(event: { detail?: { scrollTop?: number } }) {
  onContentScroll(event)
  pullRefresh?.trackContentScroll?.(event)
}
</script>

<style lang="less">
@import '@/styles/tokens.less';
.page-category { min-height: 100%; background: @color-bg-page; }
.search-bar { position: fixed; left: 0; right: 0; z-index: 95; padding: 16rpx 24rpx; background: @color-bg-card; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.search-bar.search-modal-host-open { z-index: 200; }
.panels { position: fixed; left: 0; right: 0; display: flex; flex-direction: row; overflow: hidden; z-index: 1; }
.left-wrap { flex: none; overflow: hidden; background: #fff; }
.right-wrap { flex: none; position: relative; overflow: hidden; }

.pill-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  background: #fff;
  box-sizing: border-box;
  z-index: 2;
}
.pill-bar.expanded { overflow: visible; box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.06); }
.pill-body { flex: 1; min-width: 0; height: 100%; overflow: hidden; }
.pill-bar.expanded .pill-body { overflow: visible; height: auto; }
.pill-track-expanded { display: flex; flex-wrap: wrap; align-content: flex-start; align-items: center; gap: 8rpx; padding: 10rpx 12rpx; box-sizing: border-box; width: 100%; min-height: 100%; }
.pill-item { flex: none; min-width: 144rpx; padding: 6rpx 12rpx; background: #f5f5f5; border: 2rpx solid #eee; border-radius: 28rpx; font-size: 24rpx; color: #666; white-space: nowrap; line-height: 1.4; text-align: center; }
.pill-item.active { background: @color-primary-light; border-color: @color-primary-border; color: @color-primary; font-weight: 600; }
.pill-item--pressed { opacity: 0.85; }
.pill-dropdown { flex: none; width: 72rpx; display: flex; align-items: center; justify-content: center; align-self: stretch; background: #fff; }
.pill-dropdown--pressed { background: #fafafa; }
.pill-dropdown-icon { flex-shrink: 0; opacity: 0.72; }

/** 展开面板收起按钮行 */
.pill-expand-collapse-row {
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 12rpx 0 4rpx;
}
.pill-expand-collapse {
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  padding: 6rpx 20rpx;
  background: transparent;
  border: 2rpx solid #ddd;
  border-radius: 28rpx;
  font-size: 24rpx;
  color: #999;
  line-height: 1.4;
}
.pill-expand-collapse__text { line-height: 1.4; }

.right { height: 100%; background: @color-bg-page; }
.right-inner { padding: 24rpx; box-sizing: border-box; }
.customize-panel { margin-bottom: 16rpx; padding: 32rpx 24rpx; background: #fff; border-radius: 16rpx; min-height: 280rpx; box-sizing: border-box; }
.customize-title { font-size: 32rpx; font-weight: 600; color: #333; }
.customize-desc { margin: 16rpx 0 32rpx; font-size: 26rpx; color: #666; line-height: 1.6; }
.pill-bar-scroll-spacer {
  box-sizing: border-box;
  pointer-events: none;
}
.primary-section { margin: 0; }
.primary-section-header {
  font-size: 32rpx;
  font-weight: 700;
  color: @color-primary;
  padding: 20rpx 0 12rpx;
  line-height: 1.4;
  margin-bottom: 8rpx;
}
.primary-section + .primary-section .primary-section-header {
  padding-top: 20rpx;
}
.section-empty-hint {
  padding: 8rpx 0 24rpx;
  font-size: 24rpx;
  color: @color-text-tertiary;
}
.goods-group { margin-bottom: 8rpx; }
.group-anchor { font-size: 26rpx; font-weight: 600; color: @color-primary; padding: 8rpx 0; margin-bottom: 8rpx; }
.goods-item { display: flex; box-sizing: border-box; max-width: 100%; background: #fff; border-radius: 12rpx; padding: 16rpx; margin-bottom: 16rpx; }
.goods-item.is-sold-out .thumb { opacity: 0.72; }
.thumb-wrap { position: relative; flex-shrink: 0; }
.thumb { width: 160rpx; height: 160rpx; border-radius: 8rpx; background: #f0f0f0; flex-shrink: 0; }
.info { margin-left: 16rpx; flex: 1; min-width: 0; }
.name { font-size: 26rpx; color: #333; }
.price { margin-top: 8rpx; color: @color-primary; }
.empty-tip { padding: 48rpx 0; text-align: center; font-size: @font-size-md; color: @color-text-tertiary; }
</style>
