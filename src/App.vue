<script setup lang="ts">
import { computed, ref } from 'vue'
import AcoPanel from '@/components/AcoPanel.vue'
import ControlPanel from '@/components/ControlPanel.vue'
import DpPanel from '@/components/DpPanel.vue'
import GraphCanvas from '@/components/GraphCanvas.vue'
import {
  advanceAcoStep,
  buildAcoResultFromSession,
  createAcoSession,
  startNextAcoIteration,
} from '@/algorithms/acoTsp'
import { runDpTsp } from '@/algorithms/dpTsp'
import { useGraph } from '@/composables/useGraph'
import type {
  AcoIterationSummary,
  AcoSession,
  AcoRunResult,
  DpRunResult,
  DpStep,
  HighlightEdge,
  PathResult,
  VisualState,
} from '@/types/tsp'

const pointCount = ref(7)
const timeoutMs = ref(2200)
const alpha = ref(1.2)
const beta = ref(3.4)
const antCount = ref(18)
const evaporationRate = ref(0.28)
const pheromoneConstant = ref(180)
const activeAlgorithm = ref<'dp' | 'aco'>('dp')
const sidebarPage = ref<'home' | 'detail'>('home')

const { graph, stats, regenerate, refreshWeights } = useGraph(pointCount.value)

const dpRunning = ref(false)
const acoRunning = ref(false)
const dpResult = ref<DpRunResult | null>(null)
const acoResult = ref<AcoRunResult | null>(null)
const dpStep = ref<DpStep | null>(null)
const acoIteration = ref<AcoIterationSummary | null>(null)
const acoSession = ref<AcoSession | null>(null)
const pheromoneMatrix = ref<number[][] | null>(null)
const antPositions = ref<number[]>([])
const acoDetailsVisible = ref(false)
const visualState = ref<VisualState>({
  activeNodes: [],
  edges: [],
  label: '等待运行',
})

let dpToken = 0
let acoToken = 0

const DEFAULT_TIMEOUT_MS = 2200
const DEFAULT_ALPHA = 1.2
const DEFAULT_BETA = 3.4
const DEFAULT_ANT_COUNT = 18
const DEFAULT_EVAPORATION_RATE = 0.28
const DEFAULT_PHEROMONE_CONSTANT = 180

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function buildEdgesFromPath(path: number[], kind: HighlightEdge['kind']) {
  const edges: HighlightEdge[] = []
  for (let i = 1; i < path.length; i += 1) {
    edges.push({
      from: path[i - 1],
      to: path[i],
      kind,
    })
  }
  return edges
}

function setIdleVisual() {
  visualState.value = {
    activeNodes: [],
    edges: [],
    label: '等待运行',
  }
  pheromoneMatrix.value = null
  antPositions.value = []
}

function clearDpState() {
  stopDp()
  dpResult.value = null
  dpStep.value = null
  timeoutMs.value = DEFAULT_TIMEOUT_MS
  setIdleVisual()
}

function clearAcoState() {
  stopAco()
  acoResult.value = null
  acoIteration.value = null
  acoSession.value = null
  pheromoneMatrix.value = null
  antPositions.value = []
  acoDetailsVisible.value = false
  timeoutMs.value = DEFAULT_TIMEOUT_MS
  alpha.value = DEFAULT_ALPHA
  beta.value = DEFAULT_BETA
  antCount.value = DEFAULT_ANT_COUNT
  evaporationRate.value = DEFAULT_EVAPORATION_RATE
  pheromoneConstant.value = DEFAULT_PHEROMONE_CONSTANT
  setIdleVisual()
}

function applyGraphRegenerate() {
  dpResult.value = null
  acoResult.value = null
  dpStep.value = null
  acoIteration.value = null
  acoSession.value = null
  setIdleVisual()
  regenerate(pointCount.value)
}

function applyGraphRefresh() {
  dpResult.value = null
  acoResult.value = null
  dpStep.value = null
  acoIteration.value = null
  acoSession.value = null
  setIdleVisual()
  refreshWeights()
}

function stopDp() {
  dpToken += 1
  dpRunning.value = false
}

function stopAco() {
  acoToken += 1
  acoRunning.value = false
}

function applyAcoIteration(item: AcoIterationSummary) {
  acoIteration.value = item
  pheromoneMatrix.value = item.pheromone
  antPositions.value = item.antPositions
  visualState.value = {
    activeNodes: Array.from(new Set(item.antPositions)),
    edges:
      item.roundFinished && item.bestLength !== null
        ? buildEdgesFromPath(item.bestPath, 'active').map((edge) => ({
            ...edge,
            strength:
              item.globalBestLength && item.bestLength ? item.globalBestLength / item.bestLength : 1,
          }))
        : [],
    label: item.roundFinished
      ? `第 ${item.iteration} 轮完成，当前最短路 ${item.bestLength}`
      : `第 ${item.iteration} 轮，第 ${item.stepIndex} 步`,
  }
}

function openAlgorithmPage(target: 'dp' | 'aco') {
  activeAlgorithm.value = target
  sidebarPage.value = 'detail'
}

function backToHome() {
  if (activeAlgorithm.value === 'dp') {
    clearDpState()
  } else {
    clearAcoState()
  }
  sidebarPage.value = 'home'
}

async function runDp() {
  stopDp()
  stopAco()
  const token = ++dpToken
  dpRunning.value = true
  dpResult.value = null
  dpStep.value = null
  visualState.value = {
    activeNodes: [],
    edges: [],
    label: '状压 DP 计算中',
  }

  const result = runDpTsp(graph.value)
  const start = performance.now()
  const delay = Math.max(80, Math.floor(timeoutMs.value / Math.max(result.steps.length, 1)))

  for (const step of result.steps) {
    if (token !== dpToken) return
    if (performance.now() - start > timeoutMs.value) break

    dpStep.value = step
    visualState.value = {
      activeNodes: Array.from(new Set([step.from, step.end])),
      edges: [
        { from: step.from, to: step.end, kind: 'active' },
        ...buildEdgesFromPath(step.routePreview, 'candidate'),
      ],
      label: step.note,
    }
    await sleep(delay)
  }

  if (token !== dpToken) return
  dpResult.value = result
  visualState.value = {
    activeNodes: Array.from(new Set(result.path)),
    edges: buildEdgesFromPath(result.path, 'best'),
    label: `状压 DP 最短路：${result.length}`,
  }
  dpRunning.value = false
}

function runAco() {
  stopAco()
  stopDp()
  acoRunning.value = true
  acoResult.value = null
  acoIteration.value = null
  pheromoneMatrix.value = null
  antPositions.value = []
  acoSession.value = createAcoSession(graph.value, {
    alpha: alpha.value,
    beta: beta.value,
    antCount: antCount.value,
    evaporationRate: evaporationRate.value,
    pheromoneConstant: pheromoneConstant.value,
  })
  antPositions.value = acoSession.value.ants.map((ant) => ant.currentCity)
  visualState.value = {
    activeNodes: [...antPositions.value],
    edges: [],
    label: '初始状态：蚂蚁已随机分散',
  }
}

function nextAcoIteration() {
  if (!acoSession.value) return
  const { session, summary } = advanceAcoStep(
    graph.value,
    {
      alpha: alpha.value,
      beta: beta.value,
      antCount: antCount.value,
      evaporationRate: evaporationRate.value,
      pheromoneConstant: pheromoneConstant.value,
    },
    acoSession.value,
  )
  acoSession.value = session
  applyAcoIteration(summary)
  acoResult.value = buildAcoResultFromSession(session)
}

function nextAcoRound() {
  if (!acoSession.value || !acoIteration.value?.roundFinished) return
  acoSession.value = startNextAcoIteration(graph.value, acoSession.value)
  acoIteration.value = null
  antPositions.value = acoSession.value.ants.map((ant) => ant.currentCity)
  visualState.value = {
    activeNodes: [...antPositions.value],
    edges: acoResult.value ? buildEdgesFromPath(acoResult.value.path, 'best') : [],
    label: `进入第 ${acoSession.value.iteration} 轮，蚂蚁重新随机分散`,
  }
}

function stopAcoAndShowBest() {
  stopAco()
  if (acoResult.value) {
    visualState.value = {
      activeNodes: Array.from(new Set(acoResult.value.path)),
      edges: buildEdgesFromPath(acoResult.value.path, 'best'),
      label: `当前全局最短路：${acoResult.value.length}`,
    }
    return
  }
  setIdleVisual()
}

const acoStepLabel = computed(() => {
  if (!acoIteration.value) return '未开始'
  return `第 ${acoIteration.value.iteration} 轮 / 第 ${acoIteration.value.stepIndex} 步`
})

const shortestPath = computed<PathResult | null>(() => {
  if (dpResult.value && acoResult.value) {
    return dpResult.value.length <= acoResult.value.length ? dpResult.value : acoResult.value
  }
  return dpResult.value ?? acoResult.value
})

const shortestText = computed(() => {
  if (!shortestPath.value) return '尚未求解'
  return `${shortestPath.value.path.join(' → ')}（长度 ${shortestPath.value.length}）`
})

const edgeSummary = computed(
  () => `共 ${stats.value.edgeCount} 条，最小 ${stats.value.min} / 最大 ${stats.value.max} / 平均 ${stats.value.avg}`,
)

const cityHeaders = computed(() => graph.value.points.map((point) => point.id))

function buildMatrix(
  fill: (from: number, to: number) => string | number,
): Array<{ row: number; cells: Array<string | number> }> {
  const n = graph.value.points.length
  return Array.from({ length: n }, (_, from) => ({
    row: from,
    cells: Array.from({ length: n }, (_, to) => (from === to ? '-' : fill(from, to))),
  }))
}

const acoMatrices = computed(() => {
  if (!acoSession.value) {
    return {
      visibility: [],
      pheromone: [],
      probability: [],
      delta: [],
    }
  }

  const probabilityMap = new Map<string, number>()
  const rowCountMap = new Map<number, number>()
  for (const ant of acoSession.value.ants) {
    const currentCity = ant.currentCity
    rowCountMap.set(currentCity, (rowCountMap.get(currentCity) ?? 0) + 1)
    const candidates = ant.unvisited.length ? ant.unvisited : [ant.startCity]
    const scores = candidates.map((city) => {
      const pheromone = acoSession.value!.pheromone[currentCity][city]
      const visibility = 1 / graph.value.weights[currentCity][city]
      const tau = alpha.value === 0 ? 1 : pheromone ** alpha.value
      const eta = beta.value === 0 ? 1 : visibility ** beta.value
      return tau * eta
    })
    const total = scores.reduce((sum, value) => sum + value, 0)

    candidates.forEach((city, index) => {
      const key = `${currentCity}-${city}`
      const probability = total > 0 ? scores[index] / total : 1 / candidates.length
      probabilityMap.set(key, (probabilityMap.get(key) ?? 0) + probability)
    })
  }

  return {
    visibility: buildMatrix((from, to) => Number((1 / graph.value.weights[from][to]).toFixed(4))),
    pheromone: buildMatrix((from, to) => Number(acoSession.value!.pheromone[from][to].toFixed(4))),
    probability: buildMatrix((from, to) =>
      probabilityMap.has(`${from}-${to}`)
        ? Number(
            (
              (probabilityMap.get(`${from}-${to}`) ?? 0) /
              Math.max(1, rowCountMap.get(from) ?? 1)
            ).toFixed(4),
          )
        : '-',
    ),
    delta: buildMatrix((from, to) =>
      Number((acoSession.value!.pheromone[from][to] - acoSession.value!.previousRoundPheromone[from][to]).toFixed(4)),
    ),
  }
})
</script>

<template>
  <el-container class="app-shell">
    <aside class="sidebar">
      <template v-if="sidebarPage === 'home'">
        <el-card class="hero-card dense-card" shadow="never">
          <div class="hero-topline">
            <div>
              <p class="eyebrow">TSP 教学可视化</p>
              <h1>蚁群算法与状压 DP 解旅行商问题</h1>
            </div>
            <el-tag type="warning" effect="light">双算法演示</el-tag>
          </div>
          <p class="hero-desc">
            先配置竞赛图，再进入某一种算法页面，单独查看它的参数、过程和最短路结果。
          </p>
        </el-card>

        <ControlPanel
          v-model:point-count="pointCount"
          v-model:timeout-ms="timeoutMs"
          :shortest-text="shortestText"
          :node-count="graph.points.length"
          :edge-summary="edgeSummary"
          @regenerate="applyGraphRegenerate"
          @refresh="applyGraphRefresh"
        />

        <el-card class="panel-card dense-card" shadow="never">
          <template #header>
            <div class="ep-card-header">
              <div>
                <p class="eyebrow">算法入口</p>
                <h2>进入算法配置页</h2>
              </div>
              <el-tag type="success" effect="light">Step 2</el-tag>
            </div>
          </template>

          <p class="panel-desc algorithm-intro">选择一种算法进入下一页。</p>

          <div class="algorithm-entry-row">
            <el-button type="primary" plain class="entry-button" @click="openAlgorithmPage('dp')">状压 DP</el-button>
            <el-button type="success" plain class="entry-button" @click="openAlgorithmPage('aco')">蚁群算法</el-button>
          </div>
        </el-card>
      </template>

      <template v-else>
        <el-card class="panel-card dense-card detail-topbar" shadow="never">
          <div class="detail-toolbar">
            <el-button plain @click="backToHome">返回公共配置</el-button>
            <el-tag type="warning" effect="light">算法详情页</el-tag>
          </div>
          <div>
            <p class="eyebrow">算法配置页</p>
            <h2>{{ activeAlgorithm === 'dp' ? '状压 DP' : '蚁群算法' }}</h2>
            <p class="panel-desc">
              {{
                activeAlgorithm === 'dp'
                  ? '当前页面只展示状压 DP 的参数、过程和最短路。'
                  : '当前页面只展示蚁群算法的参数、过程和最短路。'
              }}
            </p>
          </div>
        </el-card>

        <DpPanel
          v-if="activeAlgorithm === 'dp'"
          :running="dpRunning"
          :display-step="dpStep"
          :result="dpResult"
          @run="runDp"
          @stop="stopDp"
          @clear="clearDpState"
        />

        <AcoPanel
          v-else
          v-model:alpha="alpha"
          v-model:beta="beta"
          v-model:ant-count="antCount"
          v-model:evaporation-rate="evaporationRate"
          v-model:pheromone-constant="pheromoneConstant"
          :running="acoRunning"
          :current-iteration="acoIteration"
          :result="acoResult"
          :can-step-next="acoRunning && !!acoSession && !acoIteration?.roundFinished"
          :can-step-round="acoRunning && !!acoIteration?.roundFinished"
          :current-step-label="acoStepLabel"
          @run="runAco"
          @next="nextAcoIteration"
          @next-round="nextAcoRound"
          @show-details="acoDetailsVisible = true"
          @stop="stopAcoAndShowBest"
          @clear="clearAcoState"
        />
      </template>
    </aside>

    <main class="canvas-area">
      <GraphCanvas
        :graph="graph"
        :visual-state="visualState"
        :shortest-path="shortestPath"
        :pheromone-matrix="pheromoneMatrix"
        :ant-positions="antPositions"
      />
    </main>
  </el-container>

  <el-dialog v-model="acoDetailsVisible" title="边明细：可见度、信息素与概率" width="760px">
    <p class="panel-desc" v-if="acoSession">以下为当前这一步的整体矩阵状态。</p>

    <div class="matrix-grid" v-if="acoSession">
      <section class="matrix-card">
        <h3>可见度矩阵</h3>
        <table class="matrix-table">
          <thead>
            <tr>
              <th>#</th>
              <th v-for="head in cityHeaders" :key="`v-head-${head}`">{{ head }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in acoMatrices.visibility" :key="`v-row-${row.row}`">
              <th>{{ row.row }}</th>
              <td v-for="(cell, index) in row.cells" :key="`v-${row.row}-${index}`">{{ cell }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="matrix-card">
        <h3>信息素浓度矩阵</h3>
        <table class="matrix-table">
          <thead>
            <tr>
              <th>#</th>
              <th v-for="head in cityHeaders" :key="`p-head-${head}`">{{ head }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in acoMatrices.pheromone" :key="`p-row-${row.row}`">
              <th>{{ row.row }}</th>
              <td v-for="(cell, index) in row.cells" :key="`p-${row.row}-${index}`">{{ cell }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="matrix-card">
        <h3>转移概率矩阵</h3>
        <table class="matrix-table">
          <thead>
            <tr>
              <th>#</th>
              <th v-for="head in cityHeaders" :key="`pr-head-${head}`">{{ head }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in acoMatrices.probability" :key="`pr-row-${row.row}`">
              <th>{{ row.row }}</th>
              <td v-for="(cell, index) in row.cells" :key="`pr-${row.row}-${index}`">{{ cell }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="matrix-card">
        <h3>信息素变化矩阵</h3>
        <table class="matrix-table">
          <thead>
            <tr>
              <th>#</th>
              <th v-for="head in cityHeaders" :key="`d-head-${head}`">{{ head }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in acoMatrices.delta" :key="`d-row-${row.row}`">
              <th>{{ row.row }}</th>
              <td v-for="(cell, index) in row.cells" :key="`d-${row.row}-${index}`">{{ cell }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  </el-dialog>
</template>
