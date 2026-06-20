const cloud = require('wx-server-sdk')
const { getCacheVersions } = require('./common/cacheMeta')
const { resolveFileUrls } = require('./common/fileUrls')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

exports.main = async (event = {}) => {
  if (event.action === 'resolveFileUrls') {
    try {
      const urls = await resolveFileUrls(event.fileList)
      return { success: true, urls }
    } catch (err) {
      return {
        success: false,
        errMsg: err.message || err.errMsg || '换取图片链接失败',
      }
    }
  }

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
