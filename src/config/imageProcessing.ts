/**
 * 微信云存储 · 图片处理（默认 **URL 参数**，无需控制台建样式）
 * @see https://docs.cloudbase.net/storage/ci-cos-processing
 * @see https://developers.weixin.qq.com/miniprogram/dev/wxcloudservice/wxcloud/basis/imagepro.html
 *
 * mode = 'url'（默认）：tempFileURL 后拼 imageMogr2，开箱即用
 * mode = 'style'：tempFileURL/styleName，须在控制台预先添加样式（含「渐近显示」）
 */

export type CloudImageProcessMode = 'url' | 'style'

/** 默认 url = 零配置；改 style 才需要控制台建 goods-preview / goods-full */
export const CLOUD_IMAGE_PROCESS_MODE: CloudImageProcessMode = 'url'

/** preview：列表 card；详情 hero 用更小的档，渐变更明显 */
export const GOODS_IMAGE_PREVIEW_RULE = 'imageMogr2/thumbnail/240x/quality/75'

/** full：详情 hero，空串 = 原图（完整像素） */
export const GOODS_IMAGE_FULL_RULE = ''

/** 仅 mode='style' 时使用 */
export const GOODS_IMAGE_PREVIEW_STYLE = 'goods-preview'
export const GOODS_IMAGE_FULL_STYLE = 'goods-full'
