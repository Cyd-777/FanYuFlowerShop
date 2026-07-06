import { flowerRepository } from '@/data/repository/flowerRepository'
import type { EnsureOptions } from '@/data/types'
import type { LoadWithCacheResult } from '@/utils/cache/loadWithCache'
import type { FlowerKindWithVarieties } from '@/types/flower'

/**
 * 从智库 `flower_wiki` 构建花卉品类/品种目录（支组商品花材选择等读路径）。
 * 内部经 `wikiRepository.ensurePublicList` + `buildFlowerCatalogFromWiki`。
 */
export async function ensureFlowerCatalog(
  options?: EnsureOptions & { onUpdate?: (list: FlowerKindWithVarieties[]) => void },
): Promise<LoadWithCacheResult<FlowerKindWithVarieties[]>> {
  return flowerRepository.ensureCatalog(options)
}
