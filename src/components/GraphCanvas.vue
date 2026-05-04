<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { HighlightEdge, PathResult, VisualState, WeightedGraph } from '@/types/tsp'

const props = defineProps<{
  graph: WeightedGraph
  visualState: VisualState
  shortestPath: PathResult | null
  pheromoneMatrix: number[][] | null
  antPositions: number[]
}>()

interface AnimatedAnt {
  city: number
  x: number
  y: number
}

const allEdges = computed(() => {
  const edges: HighlightEdge[] = []
  const { points } = props.graph
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      edges.push({ from: i, to: j, kind: 'candidate' })
    }
  }
  return edges
})

const edgeLabels = computed(() => {
  const labels = []
  const { points, weights } = props.graph
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      labels.push({
        key: `${i}-${j}`,
        x: (points[i].x + points[j].x) / 2,
        y: (points[i].y + points[j].y) / 2,
        value: weights[i][j],
      })
    }
  }
  return labels
})

const bestEdges = computed(() => {
  if (!props.shortestPath) return []
  const result: HighlightEdge[] = []
  for (let i = 1; i < props.shortestPath.path.length; i += 1) {
    result.push({
      from: props.shortestPath.path[i - 1],
      to: props.shortestPath.path[i],
      kind: 'best',
    })
  }
  return result
})

function edgeKey(from: number, to: number) {
  return `${Math.min(from, to)}-${Math.max(from, to)}`
}

function pheromoneStrength(from: number, to: number) {
  if (!props.pheromoneMatrix) return 0
  return props.pheromoneMatrix[from][to]
}

const animatedAnts = ref<AnimatedAnt[]>([])
let animationFrame = 0

function antTarget(city: number, index: number) {
  return {
    city,
    x: props.graph.points[city].x + (index % 3) * 5 - 5,
    y: props.graph.points[city].y - 22 - Math.floor(index / 3) * 5,
  }
}

function animateAnts(targetCities: number[]) {
  const startAnts = targetCities.map((city, index) => {
    const current = animatedAnts.value[index]
    const fallback = antTarget(city, index)
    return current ?? fallback
  })
  const endAnts = targetCities.map((city, index) => antTarget(city, index))
  const startTime = performance.now()
  const duration = 420

  cancelAnimationFrame(animationFrame)

  const tick = (now: number) => {
    const progress = Math.min(1, (now - startTime) / duration)
    const eased = 1 - (1 - progress) * (1 - progress)

    animatedAnts.value = endAnts.map((target, index) => ({
      city: target.city,
      x: startAnts[index].x + (target.x - startAnts[index].x) * eased,
      y: startAnts[index].y + (target.y - startAnts[index].y) * eased,
    }))

    if (progress < 1) {
      animationFrame = requestAnimationFrame(tick)
    }
  }

  animationFrame = requestAnimationFrame(tick)
}

watch(
  () => props.antPositions,
  (positions) => {
    if (!positions.length) {
      animatedAnts.value = []
      cancelAnimationFrame(animationFrame)
      return
    }
    animateAnts(positions)
  },
  { immediate: true, deep: true },
)

watch(
  () => props.graph.points,
  () => {
    animatedAnts.value = props.antPositions.map((city, index) => antTarget(city, index))
  },
  { deep: true },
)

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrame)
})
</script>

<template>
  <el-card class="graph-panel" shadow="never">
    <template #header>
      <div class="graph-header">
        <div>
          <p class="eyebrow">算法图谱</p>
          <h2>路径、状态与信息素演化</h2>
        </div>
        <el-tag effect="light" type="primary">{{ visualState.label }}</el-tag>
      </div>
    </template>

    <div class="graph-stage">
      <svg viewBox="0 0 880 620" class="graph-canvas" aria-label="TSP 算法可视化">
        <defs>
          <linearGradient id="panelGlow" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stop-color="#409eff" />
            <stop offset="100%" stop-color="#67c23a" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="880" height="620" rx="18" class="graph-bg" />

        <g class="grid">
          <line v-for="line in 10" :key="`v-${line}`" :x1="line * 80" :x2="line * 80" y1="0" y2="620" />
          <line v-for="line in 7" :key="`h-${line}`" x1="0" x2="880" :y1="line * 80" :y2="line * 80" />
        </g>

        <g class="base-edges">
          <line
            v-for="edge in allEdges"
            :key="edgeKey(edge.from, edge.to)"
            :x1="graph.points[edge.from].x"
            :y1="graph.points[edge.from].y"
            :x2="graph.points[edge.to].x"
            :y2="graph.points[edge.to].y"
            :style="{ opacity: 0.12 + Math.min(pheromoneStrength(edge.from, edge.to) / 10, 0.22) }"
          />
        </g>

        <g class="edge-labels">
          <g v-for="label in edgeLabels" :key="label.key">
            <rect :x="label.x - 12" :y="label.y - 9" width="24" height="16" rx="6" class="edge-label-bg" />
            <text :x="label.x" :y="label.y + 3" class="edge-label-text">{{ label.value }}</text>
          </g>
        </g>

        <g class="active-edges">
          <line
            v-for="edge in visualState.edges"
            :key="`active-${edgeKey(edge.from, edge.to)}-${edge.kind}`"
            :x1="graph.points[edge.from].x"
            :y1="graph.points[edge.from].y"
            :x2="graph.points[edge.to].x"
            :y2="graph.points[edge.to].y"
            :class="['edge', `edge-${edge.kind}`]"
            :style="{ opacity: edge.strength ? Math.min(1, 0.25 + edge.strength / 3) : 1 }"
          />
        </g>

        <g class="best-edges">
          <line
            v-for="edge in bestEdges"
            :key="`best-${edgeKey(edge.from, edge.to)}`"
            :x1="graph.points[edge.from].x"
            :y1="graph.points[edge.from].y"
            :x2="graph.points[edge.to].x"
            :y2="graph.points[edge.to].y"
            class="edge edge-best"
          />
        </g>

        <g class="nodes">
          <g v-for="point in graph.points" :key="point.id">
            <circle
              :cx="point.x"
              :cy="point.y"
              :r="visualState.activeNodes.includes(point.id) ? 16 : 12"
              :class="['node', { active: visualState.activeNodes.includes(point.id) }]"
            />
            <text :x="point.x" :y="point.y + 4" class="node-label">{{ point.id }}</text>
          </g>
        </g>

        <g class="ants">
          <g v-for="(ant, index) in animatedAnts" :key="`ant-${index}`">
            <circle
              :cx="ant.x"
              :cy="ant.y"
              r="4"
              class="ant-marker"
            />
          </g>
        </g>
      </svg>
    </div>

    <div class="graph-legend">
      <el-tag size="small" effect="plain" type="info">边权已显示</el-tag>
      <el-tag size="small" effect="plain" type="danger">蚂蚁当前位置</el-tag>
      <el-tag size="small" effect="plain">背景边</el-tag>
      <el-tag size="small" effect="plain" type="primary">当前状态</el-tag>
      <el-tag size="small" effect="plain" type="success">当前最短路</el-tag>
    </div>
  </el-card>
</template>
