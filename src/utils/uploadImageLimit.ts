import { showToast } from '@/utils/feedback'

/** 单张上传图片体积上限（与 data-loading 策略一致：上传前拦截超大文件） */
export const UPLOAD_IMAGE_MAX_BYTES = 10 * 1024 * 1024

export function formatUploadImageMaxSize(): string {
  return '10MB'
}

export function isUploadImageOversized(sizeBytes: number): boolean {
  return sizeBytes > UPLOAD_IMAGE_MAX_BYTES
}

export function uploadImageSizeErrorMessage(): string {
  return `图片不能超过 ${formatUploadImageMaxSize()}`
}

export interface ChooseMediaTempFile {
  tempFilePath?: string
  size?: number
}

export function partitionUploadImageFiles(files: ChooseMediaTempFile[]): {
  accepted: ChooseMediaTempFile[]
  rejectedCount: number
} {
  const accepted: ChooseMediaTempFile[] = []
  let rejectedCount = 0

  for (const file of files) {
    if (!file?.tempFilePath) continue
    const size = Number(file.size) || 0
    if (size > 0 && isUploadImageOversized(size)) {
      rejectedCount += 1
      continue
    }
    accepted.push(file)
  }

  return { accepted, rejectedCount }
}

export function toastOversizedImages(rejectedCount: number) {
  if (rejectedCount <= 0) return
  showToast({
    title: `有 ${rejectedCount} 张超过 ${formatUploadImageMaxSize()}，已跳过`,
    icon: 'none',
  })
}

/** chooseMedia 结果过滤；默认弹出超限提示 */
export function filterChooseMediaFiles(
  files: ChooseMediaTempFile[],
  options?: { showToast?: boolean },
): ChooseMediaTempFile[] {
  const { accepted, rejectedCount } = partitionUploadImageFiles(files)
  if (options?.showToast !== false) {
    toastOversizedImages(rejectedCount)
  }
  return accepted
}

export async function assertLocalImageWithinLimit(localPath: string): Promise<void> {
  const trimmed = String(localPath || '').trim()
  if (!trimmed) return

  const size = await new Promise<number>((resolve, reject) => {
    wx.getFileInfo({
      filePath: trimmed,
      success: (res) => resolve(Number(res.size) || 0),
      fail: (err) => reject(err),
    })
  })

  if (size > 0 && isUploadImageOversized(size)) {
    throw new Error(uploadImageSizeErrorMessage())
  }
}
