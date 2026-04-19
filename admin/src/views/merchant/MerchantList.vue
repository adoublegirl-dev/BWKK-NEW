<template>
  <div class="merchant-list">
    <el-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>商家管理</span>
          <el-button type="primary" @click="showSetMerchantDialog">设为商家</el-button>
        </div>
      </template>

      <!-- 筛选 -->
      <div style="margin-bottom: 16px; display: flex; gap: 12px;">
        <el-input v-model="searchKeyword" placeholder="搜索商家名称/昵称" style="width: 200px;" clearable @keyup.enter="loadMerchants" />
        <el-button type="primary" @click="loadMerchants">查询</el-button>
      </div>

      <!-- 商家列表 -->
      <el-table :data="merchants" border stripe v-loading="loading">
        <el-table-column label="商家名称" min-width="140">
          <template #default="{ row }">
            {{ row.merchantName || row.nickname || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="nickname" label="用户昵称" width="120" />
        <el-table-column prop="email" label="邮箱" width="180" show-overflow-tooltip />
        <el-table-column prop="merchantContact" label="联系方式" width="140" />
        <el-table-column prop="merchantDesc" label="商家描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="totalPoints" label="积分余额" width="100" align="center" />
        <el-table-column label="代金券批次" width="100" align="center">
          <template #default="{ row }">
            {{ row._count?.voucherBatches ?? row.voucherBatchCount ?? '-' }}
          </template>
        </el-table-column>
        <el-table-column label="角色" width="90" align="center">
          <template #default="{ row }">
            <el-tag type="warning" size="small">商家</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="注册时间" width="170">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" align="center" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="viewMerchantDetail(row)">详情</el-button>
            <el-button size="small" type="danger" @click="handleCancelMerchant(row)">取消商家</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div style="margin-top: 16px; display: flex; justify-content: flex-end;">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          layout="total, prev, pager, next"
          @current-change="loadMerchants"
        />
      </div>
    </el-card>

    <!-- 设为商家弹窗 -->
    <el-dialog v-model="setDialogVisible" title="设为商家" width="500px" destroy-on-close>
      <el-form :model="setForm" label-width="100px">
        <el-form-item label="用户ID" required>
          <el-input v-model="setForm.userId" placeholder="输入要设为商家的用户ID" />
        </el-form-item>
        <el-form-item label="商家名称" required>
          <el-input v-model="setForm.merchantName" placeholder="请输入商家名称" />
        </el-form-item>
        <el-form-item label="商家描述">
          <el-input v-model="setForm.merchantDesc" type="textarea" :rows="2" placeholder="商家描述（可选）" />
        </el-form-item>
        <el-form-item label="联系方式">
          <el-input v-model="setForm.merchantContact" placeholder="商家联系方式（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="setDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSetMerchant" :loading="setSubmitting">确定</el-button>
      </template>
    </el-dialog>

    <!-- 商家详情弹窗 -->
    <el-dialog v-model="detailDialogVisible" :title="`商家详情 - ${currentMerchant?.merchantName || ''}`" width="800px">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="商家名称">{{ currentMerchant?.merchantName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="用户昵称">{{ currentMerchant?.nickname || '-' }}</el-descriptions-item>
        <el-descriptions-item label="邮箱">{{ currentMerchant?.email || '-' }}</el-descriptions-item>
        <el-descriptions-item label="联系方式">{{ currentMerchant?.merchantContact || '-' }}</el-descriptions-item>
        <el-descriptions-item label="积分余额">{{ currentMerchant?.totalPoints ?? '-' }}</el-descriptions-item>
        <el-descriptions-item label="商家描述" :span="2">{{ currentMerchant?.merchantDesc || '-' }}</el-descriptions-item>
      </el-descriptions>

      <!-- 代金券批次 -->
      <div style="margin-top: 20px;">
        <h4 style="margin-bottom: 10px;">代金券批次</h4>
        <el-table :data="merchantBatches" border stripe v-loading="batchLoading" max-height="300">
          <el-table-column prop="name" label="批次名称" min-width="120" show-overflow-tooltip />
          <el-table-column prop="faceValue" label="面值" width="80" align="center" />
          <el-table-column prop="totalQuantity" label="总数" width="70" align="center" />
          <el-table-column label="已发/剩余" width="100" align="center">
            <template #default="{ row }">
              {{ row.distributedQty }}/{{ row.remainingQty }}
            </template>
          </el-table-column>
          <el-table-column label="状态" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
                {{ { active: '有效', disabled: '禁用', expired: '过期' }[row.status] || row.status }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getMerchants, updateUserRole, getVoucherBatches } from '@/api/admin'

const merchants = ref([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const searchKeyword = ref('')

// ========== 设为商家弹窗 ==========
const setDialogVisible = ref(false)
const setSubmitting = ref(false)
const setForm = ref({ userId: '', merchantName: '', merchantDesc: '', merchantContact: '' })

function showSetMerchantDialog() {
  setForm.value = { userId: '', merchantName: '', merchantDesc: '', merchantContact: '' }
  setDialogVisible.value = true
}

async function handleSetMerchant() {
  if (!setForm.value.userId) return ElMessage.warning('请输入用户ID')
  if (!setForm.value.merchantName) return ElMessage.warning('请输入商家名称')

  try {
    await ElMessageBox.confirm(
      `确定将用户 ${setForm.value.userId.substring(0, 8)}... 设为商家"${setForm.value.merchantName}"吗？`,
      '确认设为商家',
      { type: 'warning' }
    )
    setSubmitting.value = true
    await updateUserRole(setForm.value.userId, {
      role: 'merchant',
      merchantName: setForm.value.merchantName,
      merchantDesc: setForm.value.merchantDesc || null,
      merchantContact: setForm.value.merchantContact || null,
    })
    ElMessage.success('已设为商家')
    setDialogVisible.value = false
    loadMerchants()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.message || '操作失败')
  } finally {
    setSubmitting.value = false
  }
}

// ========== 取消商家 ==========
async function handleCancelMerchant(row) {
  try {
    await ElMessageBox.confirm(
      `确定取消"${row.merchantName || row.nickname}"的商家身份吗？`,
      '确认取消商家',
      { type: 'warning' }
    )
    await updateUserRole(row.id, { role: 'normal' })
    ElMessage.success('已取消商家身份')
    loadMerchants()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.message || '操作失败')
  }
}

// ========== 商家详情 ==========
const detailDialogVisible = ref(false)
const currentMerchant = ref(null)
const merchantBatches = ref([])
const batchLoading = ref(false)

async function viewMerchantDetail(row) {
  currentMerchant.value = row
  detailDialogVisible.value = true
  batchLoading.value = true
  try {
    const res = await getVoucherBatches({ merchantId: row.id, pageSize: 50 })
    merchantBatches.value = res.data?.list || res.data || []
  } catch (e) {
    ElMessage.error('加载代金券批次失败')
  } finally {
    batchLoading.value = false
  }
}

// ========== 加载商家列表 ==========
async function loadMerchants() {
  loading.value = true
  try {
    const params = { page: page.value, pageSize: pageSize.value, role: 'merchant' }
    if (searchKeyword.value) params.keyword = searchKeyword.value
    const res = await getMerchants(params)
    merchants.value = res.data?.list || res.data || []
    total.value = res.data?.total || 0
  } catch (e) {
    ElMessage.error('加载商家列表失败')
  } finally {
    loading.value = false
  }
}

function formatTime(d) {
  if (!d) return ''
  return new Date(d).toLocaleString('zh-CN')
}

onMounted(loadMerchants)
</script>
