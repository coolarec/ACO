<script setup lang="ts">
import type { DpRunResult, DpStep } from '@/types/tsp'

defineProps<{
  running: boolean
  displayStep: DpStep | null
  result: DpRunResult | null
}>()

const emit = defineEmits<{
  run: []
  stop: []
  clear: []
}>()
</script>

<template>
  <el-card class="panel-card algo-panel" shadow="never">
    <template #header>
      <div class="algo-header">
        <div class="algo-heading">
          <p class="eyebrow">状压 DP</p>
          <h2>子集状态转移过程</h2>
          <p class="panel-desc">精确求解，逐步展示 <code>dp[sta][ed]</code> 更新。</p>
        </div>
        <el-tag size="small" :type="running ? 'success' : 'info'" effect="dark">{{ running ? '运行中' : '待运行' }}</el-tag>
      </div>
    </template>

    <div class="algo-toolbar">
      <el-button type="primary" :disabled="running" @click="emit('run')">运行 DP</el-button>
      <el-button :disabled="!running" @click="emit('stop')">停止</el-button>
      <el-button class="clear-config-button" type="danger" plain @click="emit('clear')">清除配置</el-button>
    </div>

    <div class="algo-metrics">
      <div class="metric-box">
        <span>模式</span>
        <strong>{{ result?.mode ?? displayStep?.mode ?? '未开始' }}</strong>
      </div>
      <div class="metric-box">
        <span>当前 sta</span>
        <strong>{{ displayStep ? displayStep.stateMask.toString(2) : '-' }}</strong>
      </div>
      <div class="metric-box">
        <span>当前 ed</span>
        <strong>{{ displayStep?.end ?? '-' }}</strong>
      </div>
      <div class="metric-box">
        <span>前驱</span>
        <strong>{{ displayStep?.from ?? '-' }}</strong>
      </div>
      <div class="metric-box">
        <span>候选值</span>
        <strong>{{ displayStep?.candidateCost ?? '-' }}</strong>
      </div>
      <div class="metric-box">
        <span>最优值</span>
        <strong>{{ displayStep?.bestCost ?? result?.length ?? '-' }}</strong>
      </div>
    </div>

    <div class="algo-note">
      <label>过程说明</label>
      <p>{{ displayStep?.note ?? '点击运行后开始展示状态转移。' }}</p>
    </div>

    <div class="algo-route">
      <label>最终路径</label>
      <p>{{ result ? result.path.join(' → ') : '尚未求解' }}</p>
    </div>
  </el-card>
</template>
