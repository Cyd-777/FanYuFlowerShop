/**
 * goods 云函数 action 分组 — bounded context 路由 + handler 文件（Phase 2）。
 *
 * | 域 | actions | 目标模块 |
 * |----|---------|----------|
 * | catalogPublic | publicList, publicSearch, publicGet, publicImage, resolveFileUrls | catalog/public.js |
 * | catalogMerchant | list, get, add, update, remove, batchRemove, batchUpdate | catalog/merchant.js |
 * | inventory | stockIn, stockOut, listWarehouseLedger, seed/cleanupWarehouseTestData | inventory.js |
 * | media | processImageUpload, assetList, assetCleanup, assetRename, assetDelete | media/assets.js |
 */

const ACTION_GROUPS = {
  catalogPublic: new Set([
    'publicList',
    'publicSearch',
    'publicGet',
    'publicImage',
    'resolveFileUrls',
  ]),
  catalogMerchant: new Set(['list', 'get', 'add', 'update', 'remove', 'batchRemove', 'batchUpdate']),
  inventory: new Set([
    'stockIn',
    'stockOut',
    'listWarehouseLedger',
    'seedWarehouseTestData',
    'cleanupWarehouseTestData',
  ]),
  media: new Set([
    'processImageUpload',
    'assetList',
    'assetCleanup',
    'assetRename',
    'assetDelete',
  ]),
}

function resolveGoodsActionGroup(action) {
  const key = String(action || '').trim()
  for (const [group, actions] of Object.entries(ACTION_GROUPS)) {
    if (actions.has(key)) return group
  }
  return 'unknown'
}

module.exports = {
  ACTION_GROUPS,
  resolveGoodsActionGroup,
}
