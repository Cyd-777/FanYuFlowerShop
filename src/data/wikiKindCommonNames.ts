/**
 * 智库种类 commonNames（与 cloudfunctions/common/wikiKindMatch.js 对齐）
 */
export const WIKI_KIND_COMMON_NAMES: Record<string, string[]> = {
  玫瑰: ['玫瑰', '月季', '蔷薇', '现代月季'],
  牡丹: ['牡丹', '富贵花', '花王', '洛阳花'],
  百合: ['百合', '强翟', '山丹'],
  康乃馨: ['康乃馨', '香石竹', '麝香石竹'],
  向日葵: ['向日葵', '太阳花', '望日莲'],
  郁金香: ['郁金香', '草麝香', '洋荷花'],
  满天星: ['满天星', '丝石竹', '锥花丝石竹'],
  绣球: ['绣球', '八仙花', '紫阳花'],
  洋桔梗: ['洋桔梗', '土耳其桔梗', '丽莎草'],
  非洲菊: ['非洲菊', '扶郎花', '太阳菊'],
  马蹄莲: ['马蹄莲', '水芋', '海芋百合'],
  芍药: ['芍药', '将离', '殿春'],
  菊花: ['菊花', '秋菊', '寿客'],
  勿忘我: ['勿忘我', '勿忘草', '星辰花'],
  紫罗兰: ['紫罗兰', '香堇菜', '草紫罗兰'],
  风信子: ['风信子', '洋水仙', '五色水仙'],
  蝴蝶兰: ['蝴蝶兰', '蝶兰', '台湾兰'],
  洋牡丹: ['洋牡丹', '花毛茛', '陆莲花'],
  雏菊: ['雏菊', '延命菊', '春菊'],
}

export function mergeProfileAliasesIntoMap(map: Map<string, string>): void {
  for (const [kindName, commonNames] of Object.entries(WIKI_KIND_COMMON_NAMES)) {
    const canonical = kindName.trim()
    if (!canonical) continue
    map.set(canonical, canonical)
    for (const alias of commonNames) {
      const key = alias.trim()
      if (key) map.set(key, canonical)
    }
  }
}
