const cloud = require('wx-server-sdk')
const { syncAllKindProfiles, syncRoseCareProfiles } = require('./wikiKindSync')
const { isMerchant, ensureCollection } = require('./helpers')
const { ensureDefaultWikiIfEmpty } = require('./init')
const { listWiki, searchWiki, getWikiById, matchWiki } = require('./read')
const {
  merchantAdd,
  merchantGet,
  merchantList,
  merchantRemove,
  merchantUpdate,
  updateCoverImage,
} = require('./write')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { action } = event
  const wxContext = cloud.getWXContext()
  const operatorOpenid = wxContext.OPENID

  try {
    // ── Admin ──
    if (action === 'syncKindProfiles') {
      const canManage = await isMerchant(operatorOpenid)
      if (!canManage) return { success: false, errMsg: '无权限同步百科品类资料' }
      await ensureCollection('flower_wiki')
      const result = await syncAllKindProfiles(db)
      return { success: true, ...result }
    }

    if (action === 'syncRoseCare') {
      const canManage = await isMerchant(operatorOpenid)
      if (!canManage) return { success: false, errMsg: '无权限同步玫瑰养护' }
      await ensureCollection('flower_wiki')
      const result = await syncRoseCareProfiles(db)
      return { success: true, ...result }
    }

    // ── 读路径（C 端） ──
    if (action === 'publicList') {
      const { keyword = '', query } = event
      if (query && typeof query === 'object') {
        const result = await searchWiki(query)
        return { success: true, list: result.list, answer: result.answer || null }
      }
      const list = await listWiki(keyword)
      return { success: true, list }
    }

    if (action === 'publicSearch') {
      const { query = {} } = event
      const result = await searchWiki(query)
      return { success: true, list: result.list, answer: result.answer || null }
    }

    if (action === 'publicGet') {
      const { id } = event
      if (!id) return { success: false, errMsg: '缺少智库 ID' }
      const wiki = await getWikiById(id)
      if (!wiki) return { success: false, errMsg: '智库内容不存在' }
      return { success: true, wiki }
    }

    if (action === 'publicMatch') {
      const { kindId = '', varietyId = '' } = event
      const wiki = await matchWiki(kindId, varietyId)
      return { success: true, wiki }
    }

    // ── 写路径（B 端商户） ──
    if (action === 'updateCoverImage') return updateCoverImage(event, operatorOpenid)
    if (action === 'list') return merchantList(event, operatorOpenid)
    if (action === 'get') return merchantGet(event, operatorOpenid)
    if (action === 'add') return merchantAdd(event, operatorOpenid)
    if (action === 'update') return merchantUpdate(event, operatorOpenid)
    if (action === 'remove') return merchantRemove(event, operatorOpenid)

    return { success: false, errMsg: '未知操作' }
  } catch (err) {
    return { success: false, errMsg: err.message || err.errMsg || '智库服务异常' }
  }
}
