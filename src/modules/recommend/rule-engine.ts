/**
 * Rule-based recommendation engine.
 * Phase 1: stub — returns empty results so frontend can be built against the interface.
 * Phase 5: replace with AI model (same interface, swap implementation).
 */
import type { RecommendInput, RecommendResult } from './types'

/**
 * Entry point for flower recommendation.
 *
 * @param input - guide or self-select input
 * @returns recommended bouquets and flower suggestions
 *
 * @remarks
 * Phase 1 returns empty results. The abstract interface is designed so that
 * Phase 5 can swap in an AI model without changing any caller.
 */
export async function recommend(input: RecommendInput): Promise<RecommendResult> {
  console.warn('[recommend] rule engine not yet implemented; input:', input)
  return { bouquets: [], flowerSuggestions: [] }
}
