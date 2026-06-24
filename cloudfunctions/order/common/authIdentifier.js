const crypto = require('crypto')

function getAuthPepper() {
  return process.env.AUTH_PEPPER || 'fanuy-dev-auth-pepper'
}

/** 微信 openid → user_auth.identifier（HMAC，不可逆） */
function hashWechatOpenId(openid) {
  return crypto.createHmac('sha256', getAuthPepper()).update(String(openid)).digest('hex')
}

module.exports = {
  hashWechatOpenId,
}
