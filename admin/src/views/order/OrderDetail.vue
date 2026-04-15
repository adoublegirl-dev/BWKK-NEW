<template>
  <div v-loading="loading">
    <el-page-header @back="$router.push('/orders')" style="margin-bottom: 20px">
      <template #content><span>订单详情</span></template>
    </el-page-header>

    <template v-if="order">
      <el-card shadow="hover">
        <template #header>订单信息</template>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="订单ID">{{ order.id }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusType(order.status)">{{ statusLabel(order.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="接单人">{{ order.user?.nickname || '未知' }}</el-descriptions-item>
          <el-descriptions-item label="帖子标题">{{ order.post?.title || '-' }}</el-descriptions-item>
          <el-descriptions-item label="帖子发单人">{{ order.post?.user?.nickname || '未知' }}</el-descriptions-item>
          <el-descriptions-item label="接单时间">{{ formatDate(order.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="提交时间">{{ order.submittedAt ? formatDate(order.submittedAt) : '-' }}</el-descriptions-item>
          <el-descriptions-item label="选中时间">{{ order.selectedAt ? formatDate(order.selectedAt) : '-' }}</el-descriptions-item>
          <el-descriptions-item label="提交描述" :span="2">{{ order.description || '-' }}</el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 提交图片 -->
      <el-card v-if="orderImages.length" shadow="hover" style="margin-top: 16px">
        <template #header>提交的图片</template>
        <el-image v-for="(img, idx) in orderImages" :key="idx" :src="img" :preview-src-list="orderImages" fit="cover" style="width: 150px; height: 150px; margin-right: 8px; border-radius: 4px" />
      </el-card>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getOrderDetail } from '../../api/admin'
import dayjs from 'dayjs'

const route = useRoute()
const loading = ref(false)
const order = ref(null)

const orderImages = computed(() => {
  if (!order.value?.images) return []
  try { return JSON.parse(order.value.images) } catch { return [] }
})

const orderStatusMap = {
  accepted: { label: '已接单', type: 'primary' },
  submitted: { label: '已提交', type: 'success' },
  selected: { label: '已选中', type: 'success' },
  rejected: { label: '已拒绝', type: 'danger' },
  expired: { label: '已过期', type: 'warning' },
}

function statusLabel(s) { return orderStatusMap[s]?.label || s }
function statusType(s) { return orderStatusMap[s]?.type || 'info' }
function formatDate(d) { return dayjs(d).format('YYYY-MM-DD HH:mm:ss') }

onMounted(async () => {
  loading.value = true
  try { const res = await getOrderDetail(route.params.id); order.value = res.data }
  finally { loading.value = false }
})
</script>
