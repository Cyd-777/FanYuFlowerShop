const cloud = require('wx-server-sdk')
const { getCacheVersions } = require('./common/cacheMeta')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

exports.main = async () => {
  try {
    const versions = await getCacheVersions()
    return { success: true, versions }
  } catch (err) {
    return {
      success: false,
      errMsg: err.message || err.errMsg || '获取缓存版本失败',
    }
  }
}
