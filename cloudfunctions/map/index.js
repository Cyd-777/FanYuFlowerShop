const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

function getMapKey() {
  return process.env.TENCENT_MAP_KEY || ''
}

async function requestTencentMap(path, params) {
  const key = getMapKey()
  if (!key) {
    return { status: -1, message: 'TENCENT_MAP_KEY not configured', data: [] }
  }

  const query = new URLSearchParams({ ...params, key })
  const url = `https://apis.map.qq.com${path}?${query.toString()}`

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`地图服务请求失败: ${res.status}`)
  }
  return res.json()
}

function normalizeSuggestion(item) {
  const location = item.location || {}
  return {
    id: String(item.id || item.title || ''),
    title: String(item.title || '').trim(),
    address: String(item.address || '').trim(),
    province: String(item.province || '').trim(),
    city: String(item.city || '').trim(),
    district: String(item.district || '').trim(),
    latitude: typeof location.lat === 'number' ? location.lat : undefined,
    longitude: typeof location.lng === 'number' ? location.lng : undefined,
  }
}

exports.main = async (event) => {
  const { action, keyword, region } = event

  if (action === 'suggest') {
    const text = String(keyword || '').trim()
    if (!text) {
      return { success: true, list: [], configured: !!getMapKey() }
    }

    if (!getMapKey()) {
      return {
        success: true,
        list: [],
        configured: false,
        errMsg: '未配置腾讯地图 Key，仅可使用粘贴识别',
      }
    }

    try {
      const result = await requestTencentMap('/ws/place/v1/suggestion', {
        keyword: text,
        region: String(region || '全国').trim() || '全国',
        page_size: '10',
      })

      if (result.status !== 0) {
        return {
          success: false,
          errMsg: result.message || '地址联想失败',
          list: [],
          configured: true,
        }
      }

      return {
        success: true,
        configured: true,
        list: (result.data || []).map(normalizeSuggestion).filter((item) => item.title),
      }
    } catch (err) {
      return {
        success: false,
        errMsg: err.message || '地址联想失败',
        list: [],
        configured: true,
      }
    }
  }

  return { success: false, errMsg: '未知操作' }
}
