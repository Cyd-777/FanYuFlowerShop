import { computed } from 'vue'
import { layoutDebugConfig } from '@/config/layoutDebug'

/** 是否开启智库字段来源标注（读 layoutDebugConfig，改配置后需重新编译） */
export function isWikiDataSourceDebugEnabled(): boolean {
  return layoutDebugConfig.showWikiDataSourceLabels === true
}

/** 智库详情 · 数据模型字段来源标注 */
export function useWikiLayoutDebug() {
  const showWikiDataSourceLabels = computed(() => isWikiDataSourceDebugEnabled())
  return { showWikiDataSourceLabels }
}
