import { parseRegionFromAddress } from '@/utils/location'

export interface ParsedAddressText {
  name?: string
  phone?: string
  province?: string
  city?: string
  district?: string
  detail?: string
}

const PHONE_RE = /1\d{10}/
const NAME_RE = /^[\u4e00-\u9fa5·]{2,8}$/

function normalizeText(raw: string) {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/[，,；;|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractPhone(text: string) {
  const match = text.match(PHONE_RE)
  return match?.[0] || ''
}

function extractName(raw: string, phone: string) {
  const lines = raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length > 1 && NAME_RE.test(lines[0])) {
    return lines[0]
  }

  if (phone) {
    const beforePhone = raw.split(phone)[0] || ''
    const tailName = beforePhone.trim().match(/([\u4e00-\u9fa5·]{2,8})\s*$/)
    if (tailName?.[1]) return tailName[1]
  }

  const firstToken = normalizeText(raw).split(' ')[0]
  if (NAME_RE.test(firstToken)) return firstToken

  return ''
}

function stripKnownParts(text: string, phone: string, name: string) {
  let rest = text
  if (phone) rest = rest.replace(phone, ' ')
  if (name) rest = rest.replace(new RegExp(name, 'g'), ' ')
  return rest.replace(/\s+/g, '').trim()
}

export function parseAddressText(raw: string): ParsedAddressText {
  const source = raw.trim()
  if (!source) return {}

  const phone = extractPhone(source)
  const name = extractName(source, phone)
  const addressSource = stripKnownParts(source.replace(/\n/g, ' '), phone, name)
  const parsedRegion = parseRegionFromAddress(addressSource)

  if (parsedRegion) {
    const detail = parsedRegion.remainder || addressSource
    return {
      name: name || undefined,
      phone: phone || undefined,
      province: parsedRegion.province,
      city: parsedRegion.city,
      district: parsedRegion.district,
      detail: detail || undefined,
    }
  }

  return {
    name: name || undefined,
    phone: phone || undefined,
    detail: addressSource || source,
  }
}
