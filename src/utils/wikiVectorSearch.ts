/**
 * wikiVectorSearch — RAG 向量搜索（AI 模块）
 *
 * 功能：智库词条 → embedding → 语义搜索
 * 当前状态：桩文件，管线搭建中
 * TODO: 接入 embedding 模型 + 向量数据库
 */

let embeddingsLoaded = false

export async function preloadEmbeddings(): Promise<void> {
  // TODO: 从云端加载预计算好的 embedding 向量
  embeddingsLoaded = true
}

export async function preloadModel(): Promise<void> {
  // TODO: 加载 ONNX embedding 模型（本地量化版）
}

export async function searchSimilar(
  _query: string,
  _topK = 5,
): Promise<Array<{ id: string; score: number; content: string }>> {
  // TODO: query → embedding → 向量相似度匹配
  if (!embeddingsLoaded) await preloadEmbeddings()
  return []
}
