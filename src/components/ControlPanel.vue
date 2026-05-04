<script setup lang="ts">
const pointCount = defineModel<number>('pointCount', { required: true })
const timeoutMs = defineModel<number>('timeoutMs', { required: true })

defineProps<{
  shortestText: string
  nodeCount: number
  edgeSummary: string
}>()

const emit = defineEmits<{
  regenerate: []
  refresh: []
}>()
</script>

<template>
  <el-card class="panel-card dense-card" shadow="never">
    <template #header>
      <div class="ep-card-header">
        <div>
          <p class="eyebrow">公共配置</p>
          <h2>图与运行控制</h2>
        </div>
        <el-tag type="warning" effect="light">Step 1</el-tag>
      </div>
    </template>

    <el-form label-position="top" class="compact-form">
      <el-row :gutter="12">
        <el-col :span="12">
          <el-form-item label="点数">
            <el-input-number v-model="pointCount" :min="4" :max="11" :step="1" controls-position="right" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="超时停止（毫秒）">
            <el-input-number v-model="timeoutMs" :min="200" :step="100" controls-position="right" />
          </el-form-item>
        </el-col>
      </el-row>

      <div class="ep-button-row">
        <el-button type="primary" @click="emit('regenerate')">生成竞赛图</el-button>
        <el-button @click="emit('refresh')">刷新边权</el-button>
      </div>
    </el-form>

    <el-descriptions :column="1" border size="small" class="dense-desc">
      <el-descriptions-item label="当前点数">{{ nodeCount }}</el-descriptions-item>
      <el-descriptions-item label="边权统计">{{ edgeSummary }}</el-descriptions-item>
      <el-descriptions-item label="当前最短路">{{ shortestText }}</el-descriptions-item>
    </el-descriptions>
  </el-card>
</template>
