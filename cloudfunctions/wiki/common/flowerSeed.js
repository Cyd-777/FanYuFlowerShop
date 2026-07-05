const { buildFlowerSeedFromCatalog } = require('./flowerCatalogCut')

/** @type {import('./flowerCatalogCut').buildFlowerSeedFromCatalog} */
const FLOWER_SEED = buildFlowerSeedFromCatalog()

module.exports = { FLOWER_SEED }
