<template>
  <div class="voucher-list">
    <el-card>
      <template #header>
        <span>代金券管理</span>
      </template>

      <!-- Tab 切换 -->
      <el-tabs v-model="activeTab">
        <!-- 批次列表 -->
        <el-tab-pane label="代金券批次" name="batches">
          <div style="margin-bottom: 16px; display: flex; gap: 12px;">
            <el-select v-model="batchStatus" placeholder="批次状态" clearable style="width: 120px;" @change="loadBatches">
              <el-option label="有效" value="active" />
              <el-option label="禁用" value="disabled" />
              <el-option label="过期" value="expired" />
            </el-select>
            <el-button type="primary" @click="loadBatches">查询</el-button>
          </div>

          <el-table :data="batches" border stripe v-loading="batchLoading">
            <el-table-column prop="name" label="批次名称" min-width="150" show-overflow-tooltip />
            <el-table-column label="商家" width="120">
              <template #default="{ row }">
                {{ row.merchant?.merchantName || row.merchant?.nickname || '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="faceValue" label="面值(积分)" width="100" align="center" />
            <el-table-column prop="pointsPerVoucher" label="单张积分成本" width="120" align="center" />
            <el-table-column prop="totalQuantity" label="总数量" width="80" align="center" />
            <el-table-column label="已发/剩余" width="100" align="center">
              <template #default="{ row }">
                {{ row.distributedQty }}/{{ row.remainingQty }}
              </template>
            </el-table-column>
            <el-table-column prop="validDays" label="有效天数" width="90" align="center" />
            <el-table-column label="状态" width="90" align="center">
              <template #default="{ row }">
                <el-tag :type="row.status === 'active' ? 'success' : row.status === 'disabled' ? 'danger' : 'info'" size="small">
                  {{ { active: '有效', disabled: '禁用', expired: '过期' }[row.status] || row.status }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="关联帖子" width="100" align="center">
              <template #default="{ row }">
                <el-button v-if="row.postId" size="small" link type="primary" @click="viewPost(row.postId)">查看</el-button>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column label="创建时间" width="170">
              <template #default="{ row }">
                {{ formatTime(row.createdAt) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120" align="center" fixed="right">
              <template #default="{ row }">
                <el-button size="small" type="primary" @click="viewBatchCodes(row)">查看实例</el-button>
              </template>
            </el-table-column>
          </el-table>

          <div style="margin-top: 16px; display: flex; justify-content: flex-end;">
            <el-pagination
              v-model:current-page="batchPage"
              v-model:page-size="batchPageSize"
              :total="batchTotal"
              layout="total, prev, pager, next"
              @current-change="loadBatches"
            />
          </div>
        </el-tab-pane>

        <!-- 代金券实例 -->
        <el-tab-pane label="代金券实例" name="codes">
          <div style="margin-bottom: 16px; display: flex; gap: 12px;">
            <el-input v-model="codeSearch" placeholder="搜索兑换码" style="width: 200px;" clearable @keyup.enter="loadCodes" />
            <el-select v-model="codeStatus" placeholder="状态" clearable style="width: 120px;" @change="loadCodes">
              <el-option label="未使用" value="unused" />
              <el-option label="已使用" value="used" />
              <el-option label="已过期" value="expired" />
            </el-select>
            <el-button type="primary" @click="loadCodes">查询</el-button>
          </div>

          <el-table :data="codes" border stripe v-loading="codeLoading">
            <el-table-column prop="redeemCode" label="兑换码" width="180">
              <template #default="{ row }">
                <span style="font-family: monospace;">{{ maskCode(row.redeemCode) }}</span>
                <el-button size="small" link @click="copyCode(row.redeemCode)">复制</el-button>
              </template>
            </el-table-column>
            <el-table-column label="批次" width="140" show-overflow-tooltip>
              <template #default="{ row }">
                {{ row.batch?.name || '-' }}
              </template>
            </el-table-column>
            <el-table-column label="持有人" width="120">
              <template #default="{ row }">
                {{ row.user?.nickname || '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="faceValue" label="面值" width="80" align="center" />
            <el-table-column label="来源" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="row.sourceType === 'merchant_post' ? 'warning' : 'primary'" size="small">
                  {{ row.sourceType === 'merchant_post' ? '商家帖子' : '商城兑换' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="90" align="center">
              <template #default="{ row }">
                <el-tag :type="{ unused: 'success', used: 'info', expired: 'danger' }[row.status]" size="small">
                  {{ { unused: '未使用', used: '已使用', expired: '已过期' }[row.status] }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="有效期" width="180">
              <template #default="{ row }">
                <span v-if="row.validFrom">{{ formatTime(row.validFrom) }} ~ {{ formatTime(row.validUntil) }}</span>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column label="核销时间" width="170">
              <template #default="{ row }">
                {{ row.redeemedAt ? formatTime(row.redeemedAt) : '-' }}
              </template>
            </el-table-column>
          </el-table>

          <div style="margin-top: 16px; display: flex; justify-content: flex-end;">
            <el-pagination
              v-model:current-page="codePage"
              v-model:page-size="codePageSize"
              :total="codeTotal"
              layout="total, prev, pager, next"
              @current-change="loadCodes"
            />
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 批次下代金券实例弹窗 -->
    <el-dialog v-model="codeDialogVisible" :title="`代金券实例 - ${currentBatch?.name || ''}`" width="900px">
      <el-table :data="batchCodes" border stripe v-loading="batchCodeLoading" max-height="500">
        <el-table-column prop="redeemCode" label="兑换码" width="180">
          <template #default="{ row }">
            <span style="font-family: monospace;">{{ maskCode(row.redeemCode) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="持有人" width="120">
          <template #default="{ row }">
            {{ row.user?.nickname || '未分发' }}
          </template>
        </el-table-column>
        <el-table-column prop="faceValue" label="面值" width="80" align="center" />
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="{ unused: 'success', used: 'info', expired: 'danger' }[row.status]" size="small">
              {{ { unused: '未使用', used: '已使用', expired: '已过期' }[row.status] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="核销时间" width="170">
          <template #default="{ row }">
            {{ row.redeemedAt ? formatTime(row.redeemedAt) : '-' }}
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getVoucherBatches, getVoucherCodes } from '@/api/admin'

const activeTab = ref('batches')

// ========== 批次列表 ==========
const batches = ref([])
const batchLoading = ref(false)
const batchPage = ref(1)
const batchPageSize = ref(10)
const batchTotal = ref(0)
const batchStatus = ref('')

async function loadBatches() {
  batchLoading.value = true
  try {
    const params = { page: batchPage.value, pageSize: batchPageSize.value }
    if (batchStatus.value) params.status = batchStatus.value
    const res = await getVoucherBatches(params)
    batches.value = res.data?.list || res.data || []
    batchTotal.value = res.data?.total || 0
  } catch (e) {
    ElMessage.error('加载代金券批次失败')
  } finally {
    batchLoading.value = false
  }
}

// ========== 代金券实例 ==========
const codes = ref([])
const codeLoading = ref(false)
const codePage = ref(1)
const codePageSize = ref(10)
const codeTotal = ref(0)
const codeSearch = ref('')
const codeStatus = ref('')

async function loadCodes() {
  codeLoading.value = true
  try {
    const params = { page: codePage.value, pageSize: codePageSize.value }
    if (codeSearch.value) params.redeemCode = codeSearch.value
    if (codeStatus.value) params.status = codeStatus.value
    const res = await getVoucherCodes(params)
    codes.value = res.data?.list || res.data || []
    codeTotal.value = res.data?.total || 0
  } catch (e) {
    ElMessage.error('加载代金券实例失败')
  } finally {
    codeLoading.value = false
  }
}

// ========== 批次实例弹窗 ==========
const codeDialogVisible = ref(false)
const currentBatch = ref(null)
const batchCodes = ref([])
const batchCodeLoading = ref(false)

async function viewBatchCodes(batch) {
  currentBatch.value = batch
  codeDialogVisible.value = true
  batchCodeLoading.value = true
  try {
    const res = await getVoucherCodes({ batchId: batch.id, pageSize: 100 })
    batchCodes.value = res.data?.list || res.data || []
  } catch (e) {
    ElMessage.error('加载代金券实例失败')
  } finally {
    batchCodeLoading.value = false
  }
}

function viewPost(postId) {
  window.open(`/admin/posts/${postId}`, '_blank')
}

function maskCode(code) {
  if (!code || code.length < 8) return code
  return code.substring(0, 4) + '****' + code.substring(code.length - 4)
}

function copyCode(code) {
  navigator.clipboard.writeText(code).then(() => {
    ElMessage.success('兑换码已复制')
  }).catch(() => {
    ElMessage.error('复制失败')
  })
}

function formatTime(d) {
  if (!d) return ''
  return new Date(d).toLocaleString('zh-CN')
}

watch(activeTab, (val) => {
  if (val === 'batches') loadBatches()
  else if (val === 'codes') loadCodes()
})

onMounted(loadBatches)
</script>
