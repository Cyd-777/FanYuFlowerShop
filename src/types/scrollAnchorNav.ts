/** ScrollAnchorNav 调试层标识（对应 layoutDebug.ts 底色） */
export type ScrollAnchorNavDebugLayer =
  | 'l1-tab-rail'
  | 'l1-scroll'
  | 'l1-content'
  | 'l2-section'
  | 'l2-pill'
  | 'l2-pill-spacer'
  | 'l2-content'

export interface ScrollAnchorTab {
  key: string
  label: string
  icon?: string
  anchorId: string
  /** 所属一阶 tab 下标；二阶锚点必填 */
  scopeIndex?: number
}
