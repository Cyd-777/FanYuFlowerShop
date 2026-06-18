/** 会员等级：以花卉命名（由低到高） */
export type MemberLevelId = 'daisy' | 'carnation' | 'tulip' | 'rose' | 'peony'

export interface MemberLevel {
  id: MemberLevelId
  /** 等级展示名，如「雏菊会员」 */
  name: string
  /** 花卉名称 */
  flower: string
  icon: string
  /** 达到该等级所需累计积分 */
  minPoints: number
  /** 购物折扣（10 = 无折扣，9.5 = 九五折） */
  discount: number
  /** 一句话花语/定位 */
  tagline: string
}

export const MEMBER_LEVELS: MemberLevel[] = [
  {
    id: 'daisy',
    name: '雏菊会员',
    flower: '雏菊',
    icon: '🌼',
    minPoints: 0,
    discount: 10,
    tagline: '清新入门，开启花店之旅',
  },
  {
    id: 'carnation',
    name: '康乃馨会员',
    flower: '康乃馨',
    icon: '💗',
    minPoints: 200,
    discount: 9.5,
    tagline: '温暖感恩，日常购花更实惠',
  },
  {
    id: 'tulip',
    name: '郁金香会员',
    flower: '郁金香',
    icon: '🌷',
    minPoints: 500,
    discount: 9.2,
    tagline: '优雅绽放，专属礼遇升级',
  },
  {
    id: 'rose',
    name: '玫瑰会员',
    flower: '玫瑰',
    icon: '🌹',
    minPoints: 1000,
    discount: 9,
    tagline: '经典浪漫，尊享配送特权',
  },
  {
    id: 'peony',
    name: '牡丹会员',
    flower: '牡丹',
    icon: '🌺',
    minPoints: 2000,
    discount: 8.5,
    tagline: '花中之王，顶级专属服务',
  },
]

export const MEMBER_LEVEL_BENEFITS = [
  '等级越高，折扣越大',
  '生日当月赠送双倍积分',
  '玫瑰及以上会员免配送费',
  '牡丹会员专享新品优先预订',
]

export function resolveMemberLevel(points: number): MemberLevel {
  const value = Math.max(0, points)
  let current = MEMBER_LEVELS[0]
  for (const level of MEMBER_LEVELS) {
    if (value >= level.minPoints) current = level
  }
  return current
}

export function resolveMemberLevelIndex(points: number): number {
  const id = resolveMemberLevel(points).id
  return MEMBER_LEVELS.findIndex((item) => item.id === id)
}

export function resolveNextMemberLevel(points: number): MemberLevel | null {
  const currentIndex = resolveMemberLevelIndex(points)
  if (currentIndex >= MEMBER_LEVELS.length - 1) return null
  return MEMBER_LEVELS[currentIndex + 1]
}

export function calcLevelProgress(points: number) {
  const current = resolveMemberLevel(points)
  const next = resolveNextMemberLevel(points)

  if (!next) {
    return {
      current,
      next: null as MemberLevel | null,
      pointsToNext: 0,
      progressPercent: 100,
    }
  }

  const span = next.minPoints - current.minPoints
  const gained = points - current.minPoints
  const progressPercent = span > 0 ? Math.min(100, Math.round((gained / span) * 100)) : 0

  return {
    current,
    next,
    pointsToNext: Math.max(0, next.minPoints - points),
    progressPercent,
  }
}

export function formatMemberDiscount(discount: number) {
  return `${discount}折`
}
