import { ref } from 'vue'
import { hasCacheEntry } from '@/utils/cache'
import { wikiRepository } from '@/data/repository'
import { CACHE_KEYS } from '@/data/cacheKeys'
import { navigateTo } from '@/utils/router'
import type { FlowerWikiListItem, WikiTab } from '@/types/wiki'
import {
  getWikiDisplayName,
  getWikiSubtitle,
  getWikiTabPreview,
} from '@/types/wiki'
import type { PageEnsureContext } from '../types'
import type { PageSetupResult } from '../pageRegistry'

export function setupWikiTabPageData(): PageSetupResult & Record<string, unknown> {
  const pageTitle = '花卉百科'
  const pageSubtitle = '图鉴 · 养殖 · 花语，花店智库'
  const searchPlaceholder = '搜索花卉名称或花语'
  const loadingText = '正在加载云端智库...'
  const emptyText = '暂无百科内容，请先在云数据库维护 flower_wiki'
  const arrowText = '›'

  const tabs: { key: WikiTab; label: string; icon: string }[] = [
    { key: 'atlas', label: '花卉图鉴', icon: '📖' },
    { key: 'care', label: '养殖指南', icon: '🌱' },
    { key: 'language', label: '花语百科', icon: '💬' },
  ]

  const activeTab = ref<WikiTab>('atlas')
  const keyword = ref('')
  const loading = ref(false)
  const wikiList = ref<FlowerWikiListItem[]>([])

  function onLoad(query: Record<string, string | undefined>) {
    const tab = query.tab
    if (tab === 'care' || tab === 'language' || tab === 'atlas') {
      activeTab.value = tab
    }
  }

  async function loadWikiList(options?: { force?: boolean }) {
    const trimmed = keyword.value.trim()

    if (options?.force) {
      wikiRepository.resetDetailPrefetch()
    }

    if (trimmed) {
      loading.value = true
      try {
        wikiList.value = await wikiRepository.searchPublicList(trimmed)
      } catch (err) {
        wx.showToast({
          title: err instanceof Error ? err.message : '加载失败',
          icon: 'none',
          duration: 3000,
        })
      } finally {
        loading.value = false
      }
      return
    }

    loading.value = options?.force ? true : !hasCacheEntry(CACHE_KEYS.wikiList)
    try {
      const { data } = await wikiRepository.ensurePublicList({
        force: options?.force,
        onUpdate: (list) => {
          wikiList.value = list
        },
      })
      wikiList.value = data
      wikiRepository.afterListLoaded(data)
    } catch (err) {
      wx.showToast({
        title: err instanceof Error ? err.message : '加载失败',
        icon: 'none',
        duration: 3000,
      })
    } finally {
      loading.value = false
    }
  }

  async function ensure(ctx: PageEnsureContext) {
    await loadWikiList({ force: ctx.force })
  }

  function displayName(item: FlowerWikiListItem) {
    return getWikiDisplayName(item)
  }

  function displaySubtitle(item: FlowerWikiListItem) {
    return getWikiSubtitle(item)
  }

  function tabPreview(item: FlowerWikiListItem) {
    return getWikiTabPreview(item, activeTab.value) || '暂无内容'
  }

  function onKeywordInput(e: { detail: { value: string } }) {
    keyword.value = e.detail.value
  }

  function switchTab(tab: WikiTab) {
    activeTab.value = tab
  }

  function goDetail(id: string) {
    navigateTo({
      url: `/pagesCustomer/wiki/detail?id=${id}&tab=${activeTab.value}`,
    })
  }

  return {
    ensure,
    onLoad,
    pullDownRefresh: true,
    refreshOnShow: true,
    pageTitle,
    pageSubtitle,
    searchPlaceholder,
    loadingText,
    emptyText,
    arrowText,
    tabs,
    activeTab,
    keyword,
    loading,
    wikiList,
    loadWikiList,
    displayName,
    displaySubtitle,
    tabPreview,
    onKeywordInput,
    switchTab,
    goDetail,
  }
}
