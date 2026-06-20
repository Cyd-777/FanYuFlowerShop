/** 批量快捷操作（上架/推荐/删除等）；弹层批量修改待后续格式确定 */
export interface GoodsBatchPatch {
  onSale?: boolean
  recommend?: boolean
  price?: number
  description?: string
  sort?: number
  unitsPerGroup?: number
}

export type GoodsBatchQuickAction =
  | 'onShelf'
  | 'offShelf'
  | 'recommendOn'
  | 'recommendOff'
  | 'remove'
