/**
 * 手写 L2 专文汇总（覆盖模板档 65 篇 + 保留原有标杆）
 */
const { NONROSE_L2_CONTENT } = require('../nonrose-l2-content')
const { LILY_L2_CONTENT } = require('../lily-l2-content')
const carnation = require('./carnation')
const hydrangea = require('./hydrangea')
const peony = require('./peony')
const tulip = require('./tulip')
const batchA = require('./batch-a')
const batchB = require('./batch-b')
const batchC = require('./batch-c')

const HANDWRITTEN_L2_CONTENT = {
  ...NONROSE_L2_CONTENT,
  ...LILY_L2_CONTENT,
  ...carnation,
  ...hydrangea,
  ...peony,
  ...tulip,
  ...batchA,
  ...batchB,
  ...batchC,
}

module.exports = { HANDWRITTEN_L2_CONTENT }
