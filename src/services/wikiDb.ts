import { getCloud, formatCloudError } from '@/services/cloud'

const COLLECTION = 'flower_wiki'

/**
 * 顾客端读智库词条（需云库 flower_wiki 对小程序可读，建议 enabled==true）
 */
export async function getWikiDocFromDb(id: string): Promise<Record<string, unknown> | null> {
  const docId = String(id || '').trim()
  if (!docId) return null

  try {
    const db = getCloud().database()
    const res = await db.collection(COLLECTION).doc(docId).get()
    const data = res.data as Record<string, unknown> | undefined
    if (!data || Object.keys(data).length === 0) return null
    if (data.enabled === false) return null
    return { ...data, _id: data._id || docId }
  } catch (err) {
    throw new Error(`读取智库失败：${formatCloudError(err)}`)
  }
}
