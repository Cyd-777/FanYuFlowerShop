const MAX_LIMIT = 100

/**
 * 分页拉取集合全部文档（微信云数据库单次 .get() 默认最多 20 条）。
 */
async function fetchAllDocs(db, collectionName, options = {}) {
  const { where, orderBy, order = 'asc' } = options
  const all = []
  let skip = 0

  while (true) {
    let query = db.collection(collectionName)
    if (where && typeof where === 'object' && Object.keys(where).length > 0) {
      query = query.where(where)
    }
    if (orderBy) {
      query = query.orderBy(orderBy, order)
    }
    const { data } = await query.skip(skip).limit(MAX_LIMIT).get()
    all.push(...data)
    if (data.length < MAX_LIMIT) break
    skip += MAX_LIMIT
  }

  return all
}

module.exports = {
  MAX_LIMIT,
  fetchAllDocs,
}
