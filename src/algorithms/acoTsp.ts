import type {
  AcoAntState,
  AcoIterationSummary,
  AcoParams,
  AcoRunResult,
  AcoSession,
  WeightedGraph,
} from '@/types/tsp'

function createMatrix(size: number, value: number) {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => value))
}

function cloneMatrix(matrix: number[][]) {
  return matrix.map((row) => [...row])
}

function chooseNext(
  current: number,
  unvisited: number[],
  pheromone: number[][],
  weights: number[][],
  alpha: number,
  beta: number,
) {
  const candidates = [...unvisited]
  const scores = candidates.map((city) => {
    const tau = alpha === 0 ? 1 : pheromone[current][city] ** alpha
    const eta = beta === 0 ? 1 : (1 / weights[current][city]) ** beta
    return tau * eta
  })
  const total = scores.reduce((sum, value) => sum + value, 0)

  if (total <= 0) {
    return candidates[Math.floor(Math.random() * candidates.length)]
  }

  let threshold = Math.random() * total

  for (let i = 0; i < candidates.length; i += 1) {
    threshold -= scores[i]
    if (threshold <= 0) return candidates[i]
  }

  return candidates[candidates.length - 1]
}

function randomStartCity(cityCount: number) {
  return Math.floor(Math.random() * cityCount)
}

function createAnt(cityCount: number): AcoAntState {
  const startCity = randomStartCity(cityCount)
  const unvisited: number[] = []
  for (let city = 0; city < cityCount; city += 1) {
    if (city !== startCity) {
      unvisited.push(city)
    }
  }

  return {
    startCity,
    currentCity: startCity,
    path: [startCity],
    unvisited,
    length: 0,
    completed: false,
  }
}

function createIterationSummary(session: AcoSession, roundFinished: boolean): AcoIterationSummary {
  return {
    iteration: session.iteration,
    stepIndex: session.stepIndex,
    antPositions: session.ants.map((ant) => ant.currentCity),
    antPaths: session.ants.map((ant) => [...ant.path]),
    pheromone: cloneMatrix(session.pheromone),
    bestLength: session.bestLength,
    bestPath: [...session.bestPath],
    globalBestLength: session.globalBestLength,
    globalBestPath: [...session.globalBestPath],
    roundFinished,
  }
}

export function createAcoSession(graph: WeightedGraph, params: AcoParams): AcoSession {
  const pheromone = createMatrix(graph.points.length, 1)
  return {
    iteration: 1,
    stepIndex: 0,
    pheromone,
    previousRoundPheromone: cloneMatrix(pheromone),
    ants: Array.from({ length: params.antCount }, () => createAnt(graph.points.length)),
    bestLength: null,
    bestPath: [],
    globalBestLength: null,
    globalBestPath: [],
  }
}

export function advanceAcoStep(
  graph: WeightedGraph,
  params: AcoParams,
  session: AcoSession,
): { session: AcoSession; summary: AcoIterationSummary } {
  const nextSession: AcoSession = {
    ...session,
    stepIndex: session.stepIndex + 1,
    ants: session.ants.map((ant) => ({ ...ant, path: [...ant.path], unvisited: [...ant.unvisited] })),
    pheromone: cloneMatrix(session.pheromone),
    bestPath: [...session.bestPath],
    globalBestPath: [...session.globalBestPath],
  }

  for (const ant of nextSession.ants) {
    if (ant.completed) continue

    if (ant.unvisited.length > 0) {
      const nextCity = chooseNext(
        ant.currentCity,
        ant.unvisited,
        nextSession.pheromone,
        graph.weights,
        params.alpha,
        params.beta,
      )
      ant.length += graph.weights[ant.currentCity][nextCity]
      ant.currentCity = nextCity
      ant.path.push(nextCity)
      ant.unvisited = ant.unvisited.filter((city) => city !== nextCity)
    } else {
      ant.length += graph.weights[ant.currentCity][ant.startCity]
      ant.currentCity = ant.startCity
      ant.path.push(ant.startCity)
      ant.completed = true
    }
  }

  const roundFinished = nextSession.ants.every((ant) => ant.completed)
  if (!roundFinished) {
    return {
      session: nextSession,
      summary: createIterationSummary(nextSession, false),
    }
  }

  const ranked = [...nextSession.ants].sort((a, b) => a.length - b.length)
  const bestAnt = ranked[0]
  nextSession.bestLength = bestAnt.length
  nextSession.bestPath = [...bestAnt.path]

  if (nextSession.globalBestLength === null || bestAnt.length < nextSession.globalBestLength) {
    nextSession.globalBestLength = bestAnt.length
    nextSession.globalBestPath = [...bestAnt.path]
  }

  const roundEndPheromone = cloneMatrix(nextSession.pheromone)
  for (let i = 0; i < graph.points.length; i += 1) {
    for (let j = 0; j < graph.points.length; j += 1) {
      nextSession.pheromone[i][j] *= 1 - params.evaporationRate
      nextSession.pheromone[i][j] = Math.max(0.05, nextSession.pheromone[i][j])
    }
  }

  for (const ant of ranked) {
    const deposit = params.pheromoneConstant / ant.length
    for (let i = 1; i < ant.path.length; i += 1) {
      const from = ant.path[i - 1]
      const to = ant.path[i]
      nextSession.pheromone[from][to] += deposit
      nextSession.pheromone[to][from] += deposit
    }
  }

  nextSession.previousRoundPheromone = roundEndPheromone

  return {
    session: nextSession,
    summary: createIterationSummary(nextSession, true),
  }
}

export function startNextAcoIteration(graph: WeightedGraph, session: AcoSession): AcoSession {
  return {
    ...session,
    iteration: session.iteration + 1,
    stepIndex: 0,
    previousRoundPheromone: cloneMatrix(session.pheromone),
    ants: Array.from({ length: session.ants.length }, () => createAnt(graph.points.length)),
    bestLength: null,
    bestPath: [],
  }
}

export function buildAcoResultFromSession(session: AcoSession): AcoRunResult | null {
  if (session.globalBestLength === null) return null
  return {
    path: [...session.globalBestPath],
    length: session.globalBestLength,
    iterations: [],
  }
}
