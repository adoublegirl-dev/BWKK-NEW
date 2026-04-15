<template>
  <div class="dashboard">
    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stat-cards">
      <el-col :span="6" v-for="card in statCards" :key="card.label">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-card-body">
            <div>
              <div class="stat-value">{{ card.value }}</div>
              <div class="stat-label">{{ card.label }}</div>
            </div>
            <el-icon :size="40" :style="{ color: card.color }"><component :is="card.icon" /></el-icon>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 最近数据 -->
    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <span>最近注册用户</span>
          </template>
          <el-table :data="dashboard.recentUsers" stripe size="small" max-height="400">
            <el-table-column prop="nickname" label="昵称" min-width="80" show-overflow-tooltip>
              <template #default="{ row }">{{ row.nickname || '未设置' }}</template>
            </el-table-column>
            <el-table-column prop="email" label="邮箱" min-width="150" show-overflow-tooltip />
            <el-table-column prop="city" label="城市" width="80" />
            <el-table-column prop="createdAt" label="注册时间" width="160">
              <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <span>最近帖子</span>
          </template>
          <el-table :data="dashboard.recentPosts" stripe size="small" max-height="400">
            <el-table-column prop="title" label="标题" min-width="120" show-overflow-tooltip />
            <el-table-column prop="status" label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="rewardAmount" label="悬赏" width="70" align="center">
              <template #default="{ row }">{{ row.rewardAmount }}分</template>
            </el-table-column>
            <el-table-column prop="createdAt" label="创建时间" width="160">
              <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { getDashboard } from '../../api/admin'
import dayjs from 'dayjs'

const dashboard = reactive({
  totalUsers: 0,
  todayUsers: 0,
  totalPosts: 0,
  activePosts: 0,
  totalOrders: 0,
  completedOrders: 0,
  recentUsers: [],
  recentPosts: [],
})

const statCards = computed(() => [
  { label: '总用户数', value: dashboard.totalUsers, icon: 'User', color: '#409eff' },
  { label: '今日新增', value: dashboard.todayUsers, icon: 'UserFilled', color: '#67c23a' },
  { label: '总帖子数', value: dashboard.totalPosts, icon: 'Document', color: '#e6a23c' },
  { label: '活跃帖子', value: dashboard.activePosts, icon: 'Promotion', color: '#f56c6c' },
])

const statusMap = {
  active: { label: '进行中', type: 'success' },
  completed: { label: '已完成', type: 'info' },
  expired: { label: '已过期', type: 'warning' },
  cancelled: { label: '已取消', type: 'danger' },
}

function statusLabel(status) {
  return statusMap[status]?.label || status
}

function statusType(status) {
  return statusMap[status]?.type || 'info'
}

function formatDate(date) {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

onMounted(async () => {
  try {
    const res = await getDashboard()
    Object.assign(dashboard, res.data)
  } catch {
    // 错误已在拦截器处理
  }
})
</script>

<style scoped>
.stat-card-body {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #333;
}

.stat-label {
  font-size: 14px;
  color: #999;
  margin-top: 4px;
}
</style>
