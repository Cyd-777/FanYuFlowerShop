import { showToast } from '@/utils/feedback'
import { navigateTo } from '@/utils/router'
import { listPublicWikiCached } from '@/modules/wiki'
import { getWikiDisplayName, wikiEntryIdentityKey } from '@/types/wiki'

/** 按种类+品种名跳转智库详情（依赖 wiki 列表缓存） */
export async function navigateToWikiVariety(
  kindName: string,
  varietyName: string,
  options?: { excludeWikiId?: string },
): Promise<boolean> {
  const kind = String(kindName || '').trim()
  const variety = String(varietyName || '').trim()
  if (!variety) {
    showToast({ title: '暂无对应词条', icon: 'none' })
    return false
  }

  try {
    const { data: list } = await listPublicWikiCached()
    const key = wikiEntryIdentityKey({ kindName: kind, varietyName: variety })
    const found = list.find((item) => {
      if (options?.excludeWikiId && item._id === options.excludeWikiId) return false
      return wikiEntryIdentityKey(item) === key
    })
    if (!found) {
      showToast({ title: `未找到「${variety}」词条`, icon: 'none' })
      return false
    }
    navigateTo({ url: `/pagesCustomer/wiki/detail?id=${found._id}` })
    return true
  } catch (err) {
    showToast({
      title: err instanceof Error ? err.message : '跳转失败',
      icon: 'none',
    })
    return false
  }
}

/** 仅品种名时尝试在同种类下匹配（易混辨识等场景） */
export async function navigateToWikiByName(
  varietyName: string,
  context: { kindName?: string; excludeWikiId?: string },
): Promise<boolean> {
  const variety = String(varietyName || '').trim()
  if (!variety) return false

  const kindName = String(context.kindName || '').trim()
  if (kindName) {
    return navigateToWikiVariety(kindName, variety, {
      excludeWikiId: context.excludeWikiId,
    })
  }

  try {
    const { data: list } = await listPublicWikiCached()
    const found = list.find((item) => {
      if (context.excludeWikiId && item._id === context.excludeWikiId) return false
      return getWikiDisplayName(item) === variety || item.varietyName === variety
    })
    if (!found) {
      showToast({ title: `未找到「${variety}」词条`, icon: 'none' })
      return false
    }
    navigateTo({ url: `/pagesCustomer/wiki/detail?id=${found._id}` })
    return true
  } catch (err) {
    showToast({
      title: err instanceof Error ? err.message : '跳转失败',
      icon: 'none',
    })
    return false
  }
}
