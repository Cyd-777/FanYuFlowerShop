const cloud = require('wx-server-sdk')
const { resolveGoodsActionGroup } = require('./actionRegistry')
const catalogPublic = require('./handlers/catalogPublic')
const catalogMerchant = require('./handlers/catalogMerchant')
const inventory = require('./handlers/inventory')
const media = require('./handlers/media')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const HANDLERS = {
  catalogPublic,
  catalogMerchant,
  inventory,
  media,
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const operatorOpenid = wxContext.OPENID
  const { action } = event
  const group = resolveGoodsActionGroup(action)
  const handler = HANDLERS[group]?.[action]
  if (handler) {
    return handler(event, { operatorOpenid, wxContext })
  }
  return { success: false, errMsg: '未知操作' }
}
