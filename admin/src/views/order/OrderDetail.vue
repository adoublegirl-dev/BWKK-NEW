<template>
  <div v-loading="loading">
    <el-page-header @back="$router.push('/orders')" style="margin-bottom: 20px">
      <template #content><span>订单详情</span></template>
    </el-page-header>

    <template v-if="order">
      <!-- 订单信息 -->
      <el-card shadow="hover">
        <template #header>
          <div style="display: flex; justify-content: space-between; align-items: center">
            <span>订单信息</span>
            <el-tag :type="statusType(order.status)">{{ statusLabel(order.status) }}</el-tag>
          </div>
        </template>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="订单ID">{{ order.id }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusType(order.status)">{{ statusLabel(order.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="接单人">{{ order.user?.nickname || '未知' }}</el-descriptions-item>
          <el-descriptions-item label="帖子标题">
            <router-link :to="`/posts/${order.post?.id}`" style="color: #409eff; text-decoration: none">
              {{ order.post?.title || '-' }}
            </router-link>
          </el-descriptions-item>
          <el-descriptions-item label="帖子发单人">{{ order.post?.user?.nickname || '未知' }}</el-descriptions-item>
          <el-descriptions-item label="帖子状态">
            <el-tag v-if="order.post?.status === 'active'" type="success" size="small">进行中</el-tag>
            <el-tag v-else-if="order.post?.status === 'completed'" type="info" size="small">已完成</el-tag>
            <el-tag v-else-if="order.post?.status === 'expired'" type="warning" size="small">已过期</el-tag>
            <el-tag v-else-if="order.post?.status === 'cancelled'" type="danger" size="small">已取消</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="接单时间">{{ formatDate(order.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="提交时间">{{ order.submittedAt ? formatDate(order.submittedAt) : '-' }}</el-descriptions-item>
          <el-descriptions-item label="选中时间">{{ order.selectedAt ? formatDate(order.selectedAt) : '-' }}</el-descriptions-item>
          <el-descriptions-item label="提交描述" :span="2">{{ order.description || '-' }}</el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 管理员操作 -->
      <el-card shadow="hover" style="margin-top: 16px">
        <template #header>管理员操作</template>

        <!-- 快捷操作按钮 -->
        <div style="margin-bottom: 16px">
          <el-button
            v-if="canConfirm"
            type="success"
            :loading="actionLoading"
            @click="handleConfirm"
          >强制选中（触发积分结算）</el-button>
          <el-button
            v-if="canReject"
            type="danger"
            :loading="actionLoading"
            @click="handleReject"
          >驳回接单</el-button>
        </div>

        <!-- 修改状态 -->
        <el-form :inline="true">
          <el-form-item label="修改订单状态">
            <el-select v-model="newStatus" placeholder="选择新状态" style="width: 180px" clearable>
              <el-option
                v-for="s in statusOptions"
                :key="s.value"
                :label="s.label"
                :value="s.value"
                :disabled="s.value === order.status"
              />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="updatingStatus" :disabled="!newStatus" @click="handleUpdateStatus">
              更新状态
            </el-button>
          </el-form-item>
        </el-form>

        <el-alert
          type="warning"
          :closable="false"
          style="margin-top: 8px"
          description="注意：直接修改状态不会触发积分结算。如需结算积分请使用「强制选中」按钮。"
        />
      </el-card>

      <!-- 提交图片 -->
      <el-card v-if="orderImages.length" shadow="hover" style="margin-top: 16px">
        <template #header>提交的图片</template>
        <el-image
          v-for="(img, idx) in orderImages"
          :key="idx"
          :src="img"
          :preview-src-list="orderImages"
          fit="cover"
          style="width: 150px; height: 150px; margin-right: 8px; border-radius: 4px"
        />
      </el-card>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getOrderDetail, adminConfirmOrder, adminRejectOrder, updateOrderStatus } from '../../api/admin'
import dayjs from 'dayjs'

const route = useRoute()
const loading = ref(false)
const actionLoading = ref(false)
const updatingStatus = ref(false)
const order = ref(null)
const newStatus = ref('')

const orderStatusMap = {
  accepted: { label: '已接单', type: 'primary' },
  submitted: { label: '已提交', type: 'success' },
  selected: { label: '已选中', type: 'success' },
  rejected: { label: '已拒绝', type: 'danger' },
  expired: { label: '已过期', type: 'warning' },
}

const statusOptions = [
  { value: 'accepted', label: '已接单' },
  { value: 'submitted', label: '已提交' },
  { value: 'selected', label: '已选中' },
  { value: 'rejected', label: '已拒绝' },
  { value: 'expired', label: '已过期' },
]

function statusLabel(s) { return orderStatusMap[s]?.label || s }
function statusType(s) { return orderStatusMap[s]?.type || 'info' }
function formatDate(d) { return d ? dayjs(d).format('YYYY-MM-DD HH:mm:ss') : '-' }

const orderImages = computed(() => {
  if (!order.value?.images) return []
  try { return JSON.parse(order.value.images) } catch { return [] }
})

const canConfirm = computed(() => {
  return order.value?.status === 'submitted' && order.value?.post?.status === 'active'
})

const canReject = computed(() => {
  return ['accepted', 'submitted'].includes(order.value?.status)
})

async function handleConfirm() {
  try {
    await ElMessageBox.confirm(
      '确认强制选中该订单？此操作将触发积分结算、驳回其他接单并标记帖子完成。',
      '强制选中',
      { confirmButtonText: '确认', cancelButtonText: '取消', type: 'warning' }
    )
    actionLoading.value = true
    await adminConfirmOrder(order.value.id)
    ElMessage.success('已强制选中')
    await fetchDetail()
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error(e?.message || '操作失败')
    }
  } finally {
    actionLoading.value = false
  }
}

async function handleReject() {
  try {
    await ElMessageBox.confirm(
      '确认驳回该接单？',
      '驳回接单',
      { confirmButtonText: '确认', cancelButtonText: '取消', type: 'warning' }
    )
    actionLoading.value = true
    await adminRejectOrder(order.value.id)
    ElMessage.success('已驳回')
    await fetchDetail()
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error(e?.message || '操作失败')
    }
  } finally {
    actionLoading.value = false
  }
}

async function handleUpdateStatus() {
  if (!newStatus.value) return
  try {
    await ElMessageBox.confirm(
      `确认将订单状态修改为「${statusOptions.find(s => s.value === newStatus.value)?.label}」？（不会触发积分结算）`,
      '修改状态',
      { confirmButtonText: '确认修改', cancelButtonText: '取消', type: 'warning' }
    )
    updatingStatus.value = true
    await updateOrderStatus(order.value.id, { status: newStatus.value })
    ElMessage.success('订单状态已更新')
    newStatus.value = ''
    await fetchDetail()
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error(e?.message || '操作失败')
    }
  } finally {
    updatingStatus.value = false
  }
}

async function fetchDetail() {
  loading.value = true
  try {
    const res = await getOrderDetail(route.params.id)
    order.value = res.data
  } finally {
    loading.value = false
  }
}

onMounted(fetchDetail)
</script>
