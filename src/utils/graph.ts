import type { Point, WeightedGraph } from '@/types/tsp'

const WIDTH = 880
const HEIGHT = 620
const PADDING = 52

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function createRandomPoints(count: number): Point[] {
  return Array.from({ length: count }, (_, id) => ({
    id,
    x: randomInt(PADDING, WIDTH - PADDING),
    y: randomInt(PADDING, HEIGHT - PADDING),
  }))
}

export function createWeights(points: Point[]): number[][] {
  const n = points.length
  const weights = Array.from({ length: n }, () => Array.from({ length: n }, () => 0))

  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const base = distance(points[i], points[j])
      const jitter = randomInt(4, 18)
      const value = Math.max(1, Math.round(base / 9 + jitter))
      weights[i][j] = value
      weights[j][i] = value
    }
  }

  return weights
}

export function createGraph(count: number): WeightedGraph {
  const points = createRandomPoints(count)
  return {
    points,
    weights: createWeights(points),
  }
}

export function refreshGraphWeights(graph: WeightedGraph): WeightedGraph {
  return {
    points: graph.points,
    weights: createWeights(graph.points),
  }
}

export function summarizeWeights(weights: number[][]) {
  const values: number[] = []
  for (let i = 0; i < weights.length; i += 1) {
    for (let j = i + 1; j < weights.length; j += 1) {
      values.push(weights[i][j])
    }
  }

  const min = values.length ? Math.min(...values) : 0
  const max = values.length ? Math.max(...values) : 0
  const avg = values.length
    ? Number((values.reduce((sum, item) => sum + item, 0) / values.length).toFixed(1))
    : 0

  return { min, max, avg, edgeCount: values.length }
}

export function pathLength(path: number[], weights: number[][]) {
  let total = 0
  for (let i = 1; i < path.length; i += 1) {
    total += weights[path[i - 1]][path[i]]
  }
  return total
}
