import type { DpRunResult, DpStep, WeightedGraph } from '@/types/tsp'

const INF = Number.POSITIVE_INFINITY
const FULL_MODE_LIMIT = 8

function maskToText(mask: number, n: number) {
  return mask.toString(2).padStart(n, '0')
}

function rebuildPath(parent: number[][], fullMask: number, end: number): number[] {
  const route = [end]
  let mask = fullMask
  let current = end

  while (current !== 0) {
    const prev = parent[mask][current]
    route.push(prev)
    mask ^= 1 << current
    current = prev
  }

  route.reverse()
  route.push(0)
  return route
}

export function runDpTsp(graph: WeightedGraph): DpRunResult {
  const n = graph.points.length
  const fullMask = (1 << n) - 1
  const dp = Array.from({ length: 1 << n }, () => Array.from({ length: n }, () => INF))
  const parent = Array.from({ length: 1 << n }, () => Array.from({ length: n }, () => -1))
  const steps: DpStep[] = []
  const mode = n <= FULL_MODE_LIMIT ? 'full' : 'summary'

  dp[1][0] = 0

  for (let mask = 1; mask <= fullMask; mask += 1) {
    if ((mask & 1) === 0) continue

    for (let end = 0; end < n; end += 1) {
      if ((mask & (1 << end)) === 0 || dp[mask][end] === INF) continue

      for (let next = 1; next < n; next += 1) {
        if (mask & (1 << next)) continue
        const nextMask = mask | (1 << next)
        const candidateCost = dp[mask][end] + graph.weights[end][next]

        if (candidateCost < dp[nextMask][next]) {
          dp[nextMask][next] = candidateCost
          parent[nextMask][next] = end
        }

        const shouldRecord =
          mode === 'full' ||
          (nextMask === fullMask && next <= Math.min(n - 1, 3)) ||
          (mask.toString(2).split('1').length - 1 >= n - 2 && next <= Math.min(n - 1, 2))

        if (shouldRecord) {
          steps.push({
            mode,
            stateMask: nextMask,
            end: next,
            from: end,
            candidateCost,
            bestCost: dp[nextMask][next],
            routePreview: [end, next],
            note:
              mode === 'full'
                ? `从 ${end} 转移到 ${next}，更新 ${maskToText(nextMask, n)}`
                : `摘要：关注 ${maskToText(nextMask, n)} 到 ${next} 的代表性转移`,
          })
        }
      }
    }
  }

  let bestLength = INF
  let bestEnd = -1
  for (let end = 1; end < n; end += 1) {
    const cycleCost = dp[fullMask][end] + graph.weights[end][0]
    if (cycleCost < bestLength) {
      bestLength = cycleCost
      bestEnd = end
    }
  }

  const path = rebuildPath(parent, fullMask, bestEnd)
  steps.push({
    mode,
    stateMask: fullMask,
    end: bestEnd,
    from: parent[fullMask][bestEnd],
    candidateCost: bestLength,
    bestCost: bestLength,
    routePreview: path,
    note: `完成闭环，最短路长度为 ${bestLength}`,
  })

  return {
    path,
    length: bestLength,
    steps,
    mode,
  }
}
