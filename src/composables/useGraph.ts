import { computed, ref } from 'vue'
import type { WeightedGraph } from '@/types/tsp'
import { createGraph, refreshGraphWeights, summarizeWeights } from '@/utils/graph'

export function useGraph(initialCount = 7) {
  const graph = ref<WeightedGraph>(createGraph(initialCount))

  const stats = computed(() => summarizeWeights(graph.value.weights))

  function regenerate(count: number) {
    graph.value = createGraph(count)
  }

  function refreshWeights() {
    graph.value = refreshGraphWeights(graph.value)
  }

  return {
    graph,
    stats,
    regenerate,
    refreshWeights,
  }
}
