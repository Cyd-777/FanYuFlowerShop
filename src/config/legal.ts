/** 用户协议 / 隐私政策版本；更新正文后递增，登录页将要求重新勾选 */
export const LEGAL_AGREEMENT_VERSION = '2026-07-06'

export type LegalDocKind = 'userAgreement' | 'privacyPolicy'

export interface LegalDocument {
  kind: LegalDocKind
  title: string
  updatedAt: string
  paragraphs: string[]
}

export const LEGAL_DOCUMENTS: Record<LegalDocKind, LegalDocument> = {
  userAgreement: {
    kind: 'userAgreement',
    title: '用户服务协议',
    updatedAt: '2026-07-06',
    paragraphs: [
      '欢迎使用梵宇花店小程序。使用本服务前，请仔细阅读本协议。',
      '一、服务说明。本小程序提供鲜花商品浏览、下单、订单查询及花材百科等内容，具体以页面展示为准。',
      '二、账号与安全。您通过微信登录后，我们将为您创建或关联店铺账号。请妥善保管设备与登录状态，发现异常请及时联系门店。',
      '三、订单与支付。订单信息以提交时页面展示为准；本阶段线下收款流程以商家确认为准。',
      '四、用户行为规范。不得利用本服务从事违法、侵权或干扰平台正常运营的行为。',
      '五、协议变更。我们可能适时更新本协议，更新后将通过登录页等方式提示您重新确认。',
    ],
  },
  privacyPolicy: {
    kind: 'privacyPolicy',
    title: '隐私政策',
    updatedAt: '2026-07-06',
    paragraphs: [
      '梵宇花店重视您的个人信息保护。本政策说明我们如何收集、使用与存储相关信息。',
      '一、我们收集的信息。包括：微信 OpenID（用于账号识别）、您主动填写的昵称与头像、订单与地址信息、订阅消息授权结果等。',
      '二、信息使用目的。用于账号登录、订单履约、消息通知、客服联系及改进服务体验。',
      '三、头像与昵称。我们将在您登录后通过「选择头像」「填写昵称」由您主动提供，不会在未告知的情况下静默获取。',
      '四、存储与共享。数据存储于微信云开发环境；除法律法规要求或履约必要外，不向无关第三方出售您的个人信息。',
      '五、您的权利。您可在「我的 → 编辑资料」修改昵称与头像，或通过门店联系我们处理相关请求。',
      '六、政策更新。政策变更时，我们将更新版本号并在登录页征得您的同意。',
    ],
  },
}
