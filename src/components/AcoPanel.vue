<script setup lang="ts">
import type { AcoIterationSummary, AcoRunResult } from '@/types/tsp'

const alpha = defineModel<number>('alpha', { required: true })
const beta = defineModel<number>('beta', { required: true })
const antCount = defineModel<number>('antCount', { required: true })
const evaporationRate = defineModel<number>('evaporationRate', { required: true })
const pheromoneConstant = defineModel<number>('pheromoneConstant', { required: true })

defineProps<{
  running: boolean
  currentIteration: AcoIterationSummary | null
  result: AcoRunResult | null
  canStepNext: boolean
  canStepRound: boolean
  currentStepLabel: string
}>()

const emit = defineEmits<{
  run: []
  stop: []
  next: []
  nextRound: []
  showDetails: []
  clear: []
}>()
</script>

<template>
  <el-card class="panel-card algo-panel" shadow="never">
    <template #header>
      <div class="algo-header">
        <div class="algo-heading">
          <p class="eyebrow">蚁群算法</p>
          <h2>信息素与可见度搜索</h2>
          <p class="panel-desc">启发式求解，按步观察蚂蚁移动和每轮最短路。</p>
        </div>
        <el-tag size="small" :type="running ? 'success' : 'info'" effect="dark">{{ running ? '运行中' : '待运行' }}</el-tag>
      </div>
    </template>

    <el-form label-position="top" class="compact-form algo-form">
      <el-row :gutter="10">
        <el-col :span="12">
          <el-form-item label="信息素权重 alpha">
            <el-input-number v-model="alpha" :min="0" :max="6" :step="0.1" controls-position="right" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="可见度权重 beta">
            <el-input-number v-model="beta" :min="0" :max="8" :step="0.1" controls-position="right" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="蚂蚁数量">
            <el-input-number v-model="antCount" :min="4" :max="64" :step="1" controls-position="right" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="挥发系数">
            <el-input-number v-model="evaporationRate" :min="0" :max="1" :step="0.05" controls-position="right" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="信息素强度常数">
            <el-input-number v-model="pheromoneConstant" :min="0" :max="1000" :step="10" controls-position="right" />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>

    <div class="algo-toolbar">
      <el-button type="primary" :disabled="running" @click="emit('run')">开始</el-button>
      <el-button type="success" :disabled="!canStepNext" @click="emit('next')">下一步</el-button>
      <el-button type="warning" :disabled="!canStepRound" @click="emit('nextRound')">下一轮</el-button>
      <el-button type="info" plain @click="emit('showDetails')">查看边明细</el-button>
      <el-button :disabled="!running" @click="emit('stop')">停止</el-button>
      <el-button class="clear-config-button" type="danger" plain @click="emit('clear')">清除配置</el-button>
    </div>

    <div class="algo-metrics">
      <div class="metric-box">
        <span>当前迭代</span>
        <strong>{{ currentIteration?.iteration ?? 0 }}</strong>
      </div>
      <div class="metric-box">
        <span>当前步骤</span>
        <strong>{{ currentStepLabel }}</strong>
      </div>
      <div class="metric-box">
        <span>本轮最优</span>
        <strong>{{ currentIteration?.bestLength ?? '-' }}</strong>
      </div>
      <div class="metric-box">
        <span>全局最优</span>
        <strong>{{ currentIteration?.globalBestLength ?? result?.length ?? '-' }}</strong>
      </div>
      <div class="metric-box metric-wide">
        <span>蚂蚁位置</span>
        <strong>{{ currentIteration ? currentIteration.antPositions.join('，') : '尚未开始' }}</strong>
      </div>
    </div>

    <div class="algo-note">
      <label>本轮路径</label>
      <p>{{ currentIteration?.bestPath.length ? currentIteration.bestPath.join(' → ') : '当前轮尚未完成' }}</p>
    </div>

    <div class="algo-route">
      <label>最终路径</label>
      <p>{{ result ? result.path.join(' → ') : '尚未求解' }}</p>
    </div>
  </el-card>
</template>
