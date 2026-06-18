import { getCloud, getCloudCallConfig } from './cloud'

interface InitDbResult {
  success: boolean
  errMsg?: string
  message?: string
}

let initPromise: Promise<InitDbResult> | null = null

/** 初始化云数据库集合与默认数据（幂等，可重复调用） */
export async function initCloudDatabase(): Promise<InitDbResult> {
  if (initPromise) return initPromise

  initPromise = (async () => {
    const cloud = getCloud()
    const config = getCloudCallConfig()

    const res = await cloud.callFunction({
      name: 'initDb',
      data: {},
      ...(config ? { config } : {}),
    })

    return res.result as InitDbResult
  })()

  try {
    return await initPromise
  } catch (err) {
    initPromise = null
    throw err
  }
}
