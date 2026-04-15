<template>
  <div v-loading="loading">
    <el-page-header @back="$router.push('/posts')" style="margin-bottom: 20px">
      <template #content><span>帖子详情</span></template>
    </el-page-header>

    <template v-if="post">
      <!-- 帖子信息 -->
      <el-card shadow="hover">
        <template #header>帖子信息</template>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="ID">{{ post.id }}</el-descriptions-item>
          <el-descriptions-item label="标题">{{ post.title }}</el-descriptions-item>
          <el-descriptions-item label="发单人">{{ post.user?.nickname || '未知' }}</el-descriptions-item>
          <el-descriptions-item label="城市">{{ post.city || post.locationName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="地址">{{ post.address || '-' }}</el-descriptions-item>
          <el-descriptions-item label="悬赏积分">{{ post.rewardAmount }}分</el-descriptions-item>
          <el-descriptions-item label="补偿比例">{{ post.compensateRate }}%</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusType(post.status)">{{ statusLabel(post.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="截止时间">{{ formatDate(post.deadline) }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDate(post.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">{{ post.description }}</el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 接单列表 -->
      <el-card shadow="hover" style="margin-top: 16px">
        <template #header>接单列表（{{ post.orders.length }}）</template>
        <el-table :data="post.orders" stripe>
          <el-table-column label="接单人" min-width="150">
            <template #default="{ row }">
              <div style="display: flex; align-items: center; gap: 6px">
                <el-avatar :size="28" :src="row.user?.avatarUrl">{{ (row.user?.nickname || '?')[0] }}</el-avatar>
                {{ row.user?.nickname || '未知' }}
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="orderStatusType(row.status)" size="small">{{ orderStatusLabel(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="description" label="提交描述" min-width="200" show-overflow-tooltip>
            <template #default="{ row }">{{ row.description || '-' }}</template>
          </el-table-column>
          <el-table-column prop="submittedAt" label="提交时间" width="160">
            <template #default="{ row }">{{ row.submittedAt ? formatDate(row.submittedAt) : '-' }}</template>
          </el-table-column>
          <el-table-column prop="createdAt" label="接单时间" width="160">
            <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="80">
            <template #default="{ row }">
              <el-button type="primary" link @click="$router.push(`/orders/${row.id}`)">详情</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getPostDetail } from '../../api/admin'
import dayjs from 'dayjs'

const route = useRoute()
const loading = ref(false)
const post = ref(null)

const statusMap = {
  active: { label: '进行中', type: 'success' },
  completed: { label: '已完成', type: 'info' },
  expired: { label: '已过期', type: 'warning' },
  cancelled: { label: '已取消', type: 'danger' },
}

const orderStatusMap = {
  accepted: { label: '已接单', type: 'primary' },
  submitted: { label: '已提交', type: 'success' },
  selected: { label: '已选中', type: 'success' },
  rejected: { label: '已拒绝', type: 'danger' },
  expired: { label: '已过期', type: 'warning' },
}

function statusLabel(s) { return statusMap[s]?.label || s }
function statusType(s) { return statusMap[s]?.type || 'info' }
function orderStatusLabel(s) { return orderStatusMap[s]?.label || s }
function orderStatusType(s) { return orderStatusMap[s]?.type || 'info' }
function formatDate(d) { return dayjs(d).format('YYYY-MM-DD HH:mm') }

async function fetchDetail() {
  loading.value = true
  try {
    const res = await getPostDetail(route.params.id)
    post.value = res.data
  } finally {
    loading.value = false
  }
}

onMounted(fetchDetail)
</script>
