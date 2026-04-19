<template>
  <div class="points-adjust">
    <el-card>
      <template #header>
        <span>积分调整</span>
      </template>

      <el-tabs v-model="activeTab">
        <!-- 单用户调整 -->
        <el-tab-pane label="单用户调整" name="single">
          <el-form :model="singleForm" label-width="100px" style="max-width: 500px;">
            <el-form-item label="用户ID" required>
              <el-input v-model="singleForm.userId" placeholder="输入用户ID" />
            </el-form-item>
            <el-form-item label="调整数量" required>
              <el-input-number v-model="singleForm.amount" :step="10" />
              <span style="margin-left: 8px; color: #999; font-size: 12px;">正数增加，负数减少</span>
            </el-form-item>
            <el-form-item label="调整原因" required>
              <el-input v-model="singleForm.reason" type="textarea" :rows="2" placeholder="请输入调整原因" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleSingleAdjust" :loading="singleSubmitting">确认调整</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 全量调整 -->
        <el-tab-pane label="全量调整" name="all">
          <el-alert
            title="全量调整将影响所有用户的积分，请谨慎操作！"
            type="warning"
            show-icon
            :closable="false"
            style="margin-bottom: 16px;"
          />
          <el-form :model="allForm" label-width="100px" style="max-width: 500px;">
            <el-form-item label="调整数量" required>
              <el-input-number v-model="allForm.amount" :step="10" :min="1" />
              <span style="margin-left: 8px; color: #999; font-size: 12px;">全量调整仅支持正数（增加积分）</span>
            </el-form-item>
            <el-form-item label="调整原因" required>
              <el-input v-model="allForm.reason" type="textarea" :rows="2" placeholder="请输入调整原因" />
            </el-form-item>
            <el-form-item>
              <el-button type="danger" @click="handleAllAdjust" :loading="allSubmitting">确认全量调整</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 调整日志 -->
        <el-tab-pane label="调整日志" name="logs">
          <el-table :data="logs" border stripe v-loading="logLoading">
            <el-table-column label="操作人" width="120">
              <template #default="{ row }">
                {{ row.admin?.username || row.adminId?.substring(0, 8) }}
              </template>
            </el-table-column>
            <el-table-column label="目标" width="120">
              <template #default="{ row }">
                <el-tag :type="row.targetType === 'all' ? 'warning' : 'primary'" size="small">
                  {{ row.targetType === 'all' ? '全量' : '单用户' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="目标用户" width="120">
              <template #default="{ row }">
                {{ row.targetUserId ? row.targetUserId.substring(0, 8) + '...' : '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="amount" label="调整数量" width="100" align="center">
              <template #default="{ row }">
                <span :style="{ color: row.amount > 0 ? '#67C23A' : '#F56C6C' }">
                  {{ row.amount > 0 ? '+' : '' }}{{ row.amount }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="reason" label="原因" min-width="200" show-overflow-tooltip />
            <el-table-column label="调整前余额" width="110" align="center">
              <template #default="{ row }">
                {{ row.beforeBalance ?? '-' }}
              </template>
            </el-table-column>
            <el-table-column label="调整后余额" width="110" align="center">
              <template #default="{ row }">
                {{ row.afterBalance ?? '-' }}
              </template>
            </el-table-column>
            <el-table-column label="时间" width="170">
              <template #default="{ row }">
                {{ formatTime(row.createdAt) }}
              </template>
            </el-table-column>
          </el-table>

          <div style="margin-top: 16px; display: flex; justify-content: flex-end;">
            <el-pagination
              v-model:current-page="logPage"
              v-model:page-size="logPageSize"
              :total="logTotal"
              layout="total, prev, pager, next"
              @current-change="loadLogs"
            />
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adjustUserPoints, adjustAllPoints, getPointsAdjustmentLogs } from '@/api/admin'

const activeTab = ref('single')

// ========== 单用户调整 ==========
const singleForm = ref({ userId: '', amount: 100, reason: '' })
const singleSubmitting = ref(false)

async function handleSingleAdjust() {
  if (!singleForm.value.userId) return ElMessage.warning('请输入用户ID')
  if (!singleForm.value.amount) return ElMessage.warning('请输入调整数量')
  if (!singleForm.value.reason) return ElMessage.warning('请输入调整原因')

  try {
    await ElMessageBox.confirm(
      `确定给用户 ${singleForm.value.userId.substring(0, 8)}... 调整 ${singleForm.value.amount > 0 ? '+' : ''}${singleForm.value.amount} 积分吗？`,
      '确认调整',
      { type: 'warning' }
    )
    singleSubmitting.value = true
    await adjustUserPoints(singleForm.value.userId, {
      amount: singleForm.value.amount,
      reason: singleForm.value.reason,
    })
    ElMessage.success('积分调整成功')
    singleForm.value = { userId: '', amount: 100, reason: '' }
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.message || '调整失败')
  } finally {
    singleSubmitting.value = false
  }
}

// ========== 全量调整 ==========
const allForm = ref({ amount: 10, reason: '' })
const allSubmitting = ref(false)

async function handleAllAdjust() {
  if (!allForm.value.amount) return ElMessage.warning('请输入调整数量')
  if (!allForm.value.reason) return ElMessage.warning('请输入调整原因')

  try {
    await ElMessageBox.confirm(
      `确定给所有用户增加 ${allForm.value.amount} 积分吗？此操作不可撤销！`,
      '⚠️ 全量调整确认',
      { type: 'warning', confirmButtonText: '确定执行', cancelButtonText: '取消' }
    )
    allSubmitting.value = true
    await adjustAllPoints({
      amount: allForm.value.amount,
      reason: allForm.value.reason,
    })
    ElMessage.success('全量积分调整已执行')
    allForm.value = { amount: 10, reason: '' }
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.message || '调整失败')
  } finally {
    allSubmitting.value = false
  }
}

// ========== 调整日志 ==========
const logs = ref([])
const logLoading = ref(false)
const logPage = ref(1)
const logPageSize = ref(10)
const logTotal = ref(0)

async function loadLogs() {
  logLoading.value = true
  try {
    const res = await getPointsAdjustmentLogs({
      page: logPage.value,
      pageSize: logPageSize.value,
    })
    logs.value = res.data?.list || res.data || []
    logTotal.value = res.data?.total || 0
  } catch (e) {
    ElMessage.error('加载调整日志失败')
  } finally {
    logLoading.value = false
  }
}

function formatTime(d) {
  if (!d) return ''
  return new Date(d).toLocaleString('zh-CN')
}

watch(activeTab, (val) => {
  if (val === 'logs') loadLogs()
})

onMounted(() => {
  // 默认加载单用户调整
})
</script>
