import { showToast } from '@/utils/feedback'
const MUNICIPALITIES = ['北京市', '上海市', '天津市', '重庆市']

export interface ParsedRegion {
  province: string
  city: string
  district: string
  remainder: string
}

export interface MapLocationResult {
  name: string
  address: string
  latitude: number
  longitude: number
}

export interface WechatAddressResult {
  name: string
  phone: string
  province: string
  city: string
  district: string
  detail: string
}

function isAuthError(errMsg = '') {
  return (
    errMsg.includes('auth deny') ||
    errMsg.includes('authorize') ||
    errMsg.includes('permission') ||
    errMsg.includes('no permission')
  )
}

function isUserCancel(errMsg = '') {
  return errMsg.includes('cancel')
}

export function parseRegionFromAddress(address: string): ParsedRegion | null {
  const trimmed = address.trim()
  if (!trimmed) return null

  for (const municipality of MUNICIPALITIES) {
    if (!trimmed.startsWith(municipality)) continue

    const rest = trimmed.slice(municipality.length)
    const districtMatch = rest.match(/^(.+?(?:区|县))/)
    const district = districtMatch?.[1] || ''
    const remainder = (district ? rest.slice(district.length) : rest).trim()
    return {
      province: municipality,
      city: municipality,
      district,
      remainder,
    }
  }

  const provinceMatch = trimmed.match(/^(.+?(?:省|自治区))/)
  if (!provinceMatch) return null

  const province = provinceMatch[1]
  let rest = trimmed.slice(province.length)
  const cityMatch = rest.match(/^(.+?(?:市|自治州|地区|盟))/)
  const city = cityMatch?.[1] || ''
  if (city) rest = rest.slice(city.length)

  const districtMatch = rest.match(/^(.+?(?:区|县|市))/)
  const district = districtMatch?.[1] || ''
  const remainder = (district ? rest.slice(district.length) : rest).trim()

  return { province, city, district, remainder }
}

export function formatRegionText(
  province?: string,
  city?: string,
  district?: string,
) {
  const parts = [province, city, district].filter(Boolean)
  if (!parts.length) return ''

  if (province && province === city) {
    return [province, district].filter(Boolean).join('')
  }

  return parts.join('')
}

export function chooseWechatAddress(): Promise<WechatAddressResult> {
  return new Promise((resolve, reject) => {
    wx.chooseAddress({
      success: (res) => {
        resolve({
          name: res.userName?.trim() || '',
          phone: res.telNumber?.trim() || '',
          province: res.provinceName?.trim() || '',
          city: res.cityName?.trim() || '',
          district: res.countyName?.trim() || '',
          detail: res.detailInfo?.trim() || '',
        })
      },
      fail: (err) => {
        if (isUserCancel(err.errMsg || '')) {
          reject(new Error('USER_CANCEL'))
          return
        }
        reject(new Error(err.errMsg || '获取微信地址失败'))
      },
    })
  })
}

export function chooseMapLocation(): Promise<MapLocationResult> {
  return new Promise((resolve, reject) => {
    wx.chooseLocation({
      success: (res) => {
        resolve({
          name: res.name?.trim() || '',
          address: res.address?.trim() || '',
          latitude: res.latitude,
          longitude: res.longitude,
        })
      },
      fail: (err) => {
        const errMsg = err.errMsg || ''
        if (isUserCancel(errMsg)) {
          reject(new Error('USER_CANCEL'))
          return
        }
        if (isAuthError(errMsg)) {
          reject(new Error('LOCATION_AUTH_DENIED'))
          return
        }
        reject(new Error(errMsg || '地图选点失败'))
      },
    })
  })
}

export function promptOpenLocationSetting() {
  return new Promise<boolean>((resolve) => {
    wx.showModal({
      title: '需要位置权限',
      content: '请在设置中允许使用位置信息，以便通过地图选择收货地址',
      confirmText: '去设置',
      success: (res) => {
        if (!res.confirm) {
          resolve(false)
          return
        }
        wx.openSetting({
          success: (setting) => {
            resolve(!!setting.authSetting['scope.userLocation'])
          },
          fail: () => resolve(false),
        })
      },
      fail: () => resolve(false),
    })
  })
}

export async function chooseMapLocationWithAuth(): Promise<MapLocationResult> {
  try {
    return await chooseMapLocation()
  } catch (err) {
    if (!(err instanceof Error) || err.message !== 'LOCATION_AUTH_DENIED') {
      throw err
    }

    const granted = await promptOpenLocationSetting()
    if (!granted) {
      throw new Error('未授权位置信息')
    }
    return chooseMapLocation()
  }
}

export function applyMapLocationToForm(
  form: {
    province: string
    city: string
    district: string
    detail: string
    latitude?: number
    longitude?: number
    poiName?: string
  },
  location: MapLocationResult,
) {
  const parsed = parseRegionFromAddress(location.address)
  if (parsed) {
    form.province = parsed.province
    form.city = parsed.city
    form.district = parsed.district
    const detailParts = [parsed.remainder, location.name].filter(Boolean)
    form.detail = detailParts.join(' ') || location.address
  } else {
    form.detail = [location.address, location.name].filter(Boolean).join(' ')
  }

  form.latitude = location.latitude
  form.longitude = location.longitude
  form.poiName = location.name
}

export function handleLocationError(err: unknown, fallback = '操作失败') {
  if (err instanceof Error && err.message === 'USER_CANCEL') return

  const message = err instanceof Error ? err.message : fallback
  showToast({ title: message, icon: 'none' })
}
