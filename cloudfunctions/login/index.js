const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()

/** 黑箱录入的商家 OpenID（上线前迁移至 merchants 集合） */
const MERCHANT_OPENIDS = [
  'oiDICxmmuGHJTKQzDsG9X32n2fAs', // 店长 a2267892497
]

exports.main = async () => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!openid) {
    return {
      success: false,
      errMsg: '无法获取 openid，请确认已开通云开发',
      openid: '',
      isMerchant: false,
    }
  }

  let isMerchant = MERCHANT_OPENIDS.includes(openid)
  let merchantName = ''

  try {
    const { data } = await db.collection('merchants').where({ openid }).limit(1).get()
    if (data.length > 0) {
      isMerchant = true
      merchantName = data[0].name || ''
    }
  } catch (err) {
    // merchants 集合尚未创建时，仅使用 OpenID 白名单
  }

  return {
    success: true,
    openid,
    isMerchant,
    merchantName,
  }
}
