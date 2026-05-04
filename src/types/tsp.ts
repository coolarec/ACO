export interface Point {
  id: number
  x: number
  y: number
}

export interface WeightedGraph {
  points: Point[]
  weights: number[][]
}

export interface PathResult {
  path: number[]
  length: number
}

export interface HighlightEdge {
  from: number
  to: number
  strength?: number
  kind: 'candidate' | 'active' | 'best'
}

export interface VisualState {
  activeNodes: number[]
  edges: HighlightEdge[]
  label: string
}

export interface DpStep {
  mode: 'full' | 'summary'
  stateMask: number
  end: number
  from: number
  candidateCost: number
  bestCost: number
  routePreview: number[]
  note: string
}

export interface DpRunResult extends PathResult {
  steps: DpStep[]
  mode: 'full' | 'summary'
}

export interface AcoParams {
  alpha: number
  beta: number
  antCount: number
  evaporationRate: number
  pheromoneConstant: number
}

export interface AcoAntState {
  startCity: number
  currentCity: number
  path: number[]
  unvisited: number[]
  length: number
  completed: boolean
}

export interface AcoIterationSummary {
  iteration: number
  stepIndex: number
  antPositions: number[]
  antPaths: number[][]
  pheromone: number[][]
  bestLength: number | null
  bestPath: number[]
  globalBestLength: number | null
  globalBestPath: number[]
  roundFinished: boolean
}

export interface AcoSession {
  iteration: number
  stepIndex: number
  pheromone: number[][]
  previousRoundPheromone: number[][]
  ants: AcoAntState[]
  bestLength: number | null
  bestPath: number[]
  globalBestLength: number | null
  globalBestPath: number[]
}

export interface AcoRunResult extends PathResult {
  iterations: AcoIterationSummary[]
}
