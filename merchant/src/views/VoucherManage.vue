<template>
  <div class="voucher-manage">
    <!-- 创建代金券批次 -->
    <el-card shadow="hover" style="margin-bottom: 20px;">
      <template #header>
        <div class="card-header">
          <span>创建代金券批次</span>
        </div>
      </template>
      <el-form :model="createForm" :rules="createRules" ref="createFormRef" label-width="120px" inline>
        <el-form-item label="批次名称" prop="name">
          <el-input v-model="createForm.name" placeholder="如：新用户专享券" style="width: 200px" />
        </el-form-item>
        <el-form-item label="面值(积分)" prop="faceValue">
          <el-input-number v-model="createForm.faceValue" :min="10" :step="10" />
        </el-form-item>
        <el-form-item label="数量" prop="totalQuantity">
          <el-input-number v-model="createForm.totalQuantity" :min="1" :max="1000" />
        </el-form-item>
        <el-form-item label="有效天数" prop="validDays">
          <el-input-number v-model="createForm.validDays" :min="1" :max="365" />
        </el-form-item>
        <el-form-item label="批次描述">
          <el-input v-model="createForm.description" placeholder="选填" style="width: 240px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onCreateBatch" :loading="creating">
            创建批次 (消耗 {{ totalCost }} 积分)
          </el-button>
        </el-form-item>
      </el-form>
      <div class="cost-hint">
        <el-text type="info" size="small">
          每张代金券成本 = 面值积分，总消耗 = 面值 × 数量 (10积分=1代金券面值)
        </el-text>
      </div>
    </el-card>

    <!-- 批次列表 -->
    <el-card shadow="hover">
      <template #header><span>代金券批次列表</span></template>
      <el-table :data="batches" stripe v-loading="loading">
        <el-table-column prop="name" label="批次名称" min-width="140" />
        <el-table-column prop="faceValue" label="面值" width="80" />
        <el-table-column prop="totalQuantity" label="总数量" width="80" />
        <el-table-column prop="distributedQty" label="已分发" width="80" />
        <el-table-column prop="remainingQty" label="剩余" width="80" />
        <el-table-column prop="validDays" label="有效天数" width="90" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="170" />
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="viewBatchCodes(row)">查看券码</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-if="total > pageSize"
        :current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="onPageChange"
        style="margin-top: 16px; justify-content: flex-end;"
      />
    </el-card>

    <!-- 券码详情弹窗 -->
    <el-dialog v-model="showCodesDialog" :title="`批次券码 - ${currentBatch?.name || ''}`" width="700px">
      <el-table :data="codes" stripe v-loading="codesLoading" size="small">
        <el-table-column prop="redeemCode" label="兑换码" min-width="160" />
        <el-table-column prop="faceValue" label="面值" width="80" />
        <el-table-column label="持有人" width="120">
          <template #default="{ row }">
            {{ row.user?.nickname || '未分发' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="codeStatusType(row.status)" size="small">{{ codeStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="validUntil" label="有效期至" width="170" />
      </el-table>
      <el-pagination
        v-if="codesTotal > codesPageSize"
        :current-page="codesPage"
        :page-size="codesPageSize"
        :total="codesTotal"
        layout="total, prev, pager, next"
        @current-change="onCodesPageChange"
        style="margin-top: 12px; justify-content: flex-end;"
      />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { createVoucherBatch, getVoucherBatches, getVoucherBatchCodes } from '../api/merchant'

const loading = ref(false)
const batches = ref([])
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)

const creating = ref(false)
const createFormRef = ref(null)
const createForm = reactive({
  name: '',
  faceValue: 10,
  totalQuantity: 10,
  validDays: 30,
  description: ''
})

const createRules = {
  name: [{ required: true, message: '请输入批次名称', trigger: 'blur' }],
  faceValue: [{ required: true, message: '请输入面值', trigger: 'blur' }],
  totalQuantity: [{ required: true, message: '请输入数量', trigger: 'blur' }],
  validDays: [{ required: true, message: '请输入有效天数', trigger: 'blur' }]
}

const totalCost = computed(() => createForm.faceValue * createForm.totalQuantity)

// 券码详情
const showCodesDialog = ref(false)
const currentBatch = ref(null)
const codes = ref([])
const codesLoading = ref(false)
const codesPage = ref(1)
const codesPageSize = ref(20)
const codesTotal = ref(0)

function statusType(status) {
  const map = { active: 'success', disabled: 'warning', expired: 'info' }
  return map[status] || 'info'
}

function statusText(status) {
  const map = { active: '有效', disabled: '已禁用', expired: '已过期' }
  return map[status] || status
}

function codeStatusType(status) {
  const map = { unused: 'success', used: 'info', expired: 'danger' }
  return map[status] || 'info'
}

function codeStatusText(status) {
  const map = { unused: '未使用', used: '已使用', expired: '已过期' }
  return map[status] || status
}

async function loadBatches() {
  loading.value = true
  try {
    const res = await getVoucherBatches({ page: page.value, pageSize: pageSize.value })
    batches.value = res.data?.list || res.data || []
    total.value = res.data?.total || 0
  } catch (e) {
    ElMessage.error('加载批次列表失败')
  } finally {
    loading.value = false
  }
}

async function onCreateBatch() {
  try {
    await createFormRef.value.validate()
  } catch { return }

  try {
    await ElMessageBox.confirm(
      `确认创建代金券批次？将消耗 ${totalCost.value} 积分。`,
      '确认创建',
      { confirmButtonText: '确认', cancelButtonText: '取消', type: 'warning' }
    )
  } catch { return }

  creating.value = true
  try {
    await createVoucherBatch(createForm)
    ElMessage.success('创建成功')
    createForm.name = ''
    createForm.description = ''
    loadBatches()
  } catch (e) {
    ElMessage.error(e.message || '创建失败')
  } finally {
    creating.value = false
  }
}

async function viewBatchCodes(batch) {
  currentBatch.value = batch
  codesPage.value = 1
  showCodesDialog.value = true
  await loadCodes()
}

async function loadCodes() {
  if (!currentBatch.value) return
  codesLoading.value = true
  try {
    const res = await getVoucherBatchCodes(currentBatch.value.id, {
      page: codesPage.value,
      pageSize: codesPageSize.value
    })
    codes.value = res.data?.list || res.data || []
    codesTotal.value = res.data?.total || 0
  } catch (e) {
    ElMessage.error('加载券码失败')
  } finally {
    codesLoading.value = false
  }
}

function onPageChange(p) {
  page.value = p
  loadBatches()
}

function onCodesPageChange(p) {
  codesPage.value = p
  loadCodes()
}

onMounted(() => loadBatches())
</script>

<style scoped>
.card-header { display: flex; justify-content: space-between; align-items: center; }
.cost-hint { margin-top: 8px; }
</style>
