<template>
  <div class="redeem-page">
    <!-- 核销操作 -->
    <el-card shadow="hover" style="margin-bottom: 20px;">
      <template #header><span>核销代金券</span></template>
      <el-form :inline="true" @submit.prevent>
        <el-form-item label="兑换码">
          <el-input
            v-model="redeemCode"
            placeholder="请输入16位兑换码"
            maxlength="16"
            style="width: 280px"
            clearable
          >
            <template #append>
              <el-button @click="onQuery" :loading="querying">查询</el-button>
            </template>
          </el-input>
        </el-form-item>
      </el-form>

      <!-- 查询结果 -->
      <div v-if="voucherInfo" class="voucher-result">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="兑换码">{{ voucherInfo.redeemCode }}</el-descriptions-item>
          <el-descriptions-item label="面值">{{ voucherInfo.faceValue }} 积分</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="codeStatusType(voucherInfo.status)">{{ codeStatusText(voucherInfo.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="持有人">{{ voucherInfo.user?.nickname || '未知' }}</el-descriptions-item>
          <el-descriptions-item label="有效期开始">{{ voucherInfo.validFrom || '-' }}</el-descriptions-item>
          <el-descriptions-item label="有效期结束">{{ voucherInfo.validUntil || '-' }}</el-descriptions-item>
        </el-descriptions>
        <div class="redeem-action" v-if="voucherInfo.status === 'unused'">
          <el-button type="danger" @click="onRedeem" :loading="redeeming">确认核销</el-button>
        </div>
        <el-alert v-else-if="voucherInfo.status === 'used'" type="warning" :closable="false" show-icon style="margin-top: 12px;">
          该代金券已于 {{ voucherInfo.redeemedAt }} 被核销
        </el-alert>
        <el-alert v-else-if="voucherInfo.status === 'expired'" type="error" :closable="false" show-icon style="margin-top: 12px;">
          该代金券已过期
        </el-alert>
      </div>
    </el-card>

    <!-- 核销历史 -->
    <el-card shadow="hover">
      <template #header><span>核销历史</span></template>
      <el-table :data="history" stripe v-loading="historyLoading">
        <el-table-column prop="redeemCode" label="兑换码" min-width="160" />
        <el-table-column prop="faceValue" label="面值" width="80" />
        <el-table-column label="持有人" width="120">
          <template #default="{ row }">
            {{ row.user?.nickname || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="redeemedAt" label="核销时间" min-width="170" />
      </el-table>
      <el-pagination
        v-if="historyTotal > historyPageSize"
        :current-page="historyPage"
        :page-size="historyPageSize"
        :total="historyTotal"
        layout="total, prev, pager, next"
        @current-change="onHistoryPageChange"
        style="margin-top: 16px; justify-content: flex-end;"
      />
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { queryVoucherByCode, redeemVoucher, getRedeemHistory } from '../api/merchant'

const redeemCode = ref('')
const querying = ref(false)
const voucherInfo = ref(null)
const redeeming = ref(false)

const historyLoading = ref(false)
const history = ref([])
const historyPage = ref(1)
const historyPageSize = ref(10)
const historyTotal = ref(0)

function codeStatusType(status) {
  const map = { unused: 'success', used: 'info', expired: 'danger' }
  return map[status] || 'info'
}

function codeStatusText(status) {
  const map = { unused: '可核销', used: '已核销', expired: '已过期' }
  return map[status] || status
}

async function onQuery() {
  if (!redeemCode.value.trim()) {
    ElMessage.warning('请输入兑换码')
    return
  }
  querying.value = true
  voucherInfo.value = null
  try {
    const res = await queryVoucherByCode(redeemCode.value.trim())
    voucherInfo.value = res.data
  } catch (e) {
    ElMessage.error(e.message || '查询失败')
  } finally {
    querying.value = false
  }
}

async function onRedeem() {
  if (!voucherInfo.value) return
  try {
    await ElMessageBox.confirm(
      `确认核销兑换码 ${voucherInfo.value.redeemCode}？面值 ${voucherInfo.value.faceValue} 积分。此操作不可撤销。`,
      '确认核销',
      { confirmButtonText: '确认核销', cancelButtonText: '取消', type: 'warning' }
    )
  } catch { return }

  redeeming.value = true
  try {
    await redeemVoucher({ redeemCode: voucherInfo.value.redeemCode })
    ElMessage.success('核销成功')
    voucherInfo.value.status = 'used'
    // 刷新核销历史
    loadHistory()
  } catch (e) {
    ElMessage.error(e.message || '核销失败')
  } finally {
    redeeming.value = false
  }
}

async function loadHistory() {
  historyLoading.value = true
  try {
    const res = await getRedeemHistory({ page: historyPage.value, pageSize: historyPageSize.value })
    history.value = res.data?.list || res.data || []
    historyTotal.value = res.data?.total || 0
  } catch (e) {
    ElMessage.error('加载核销历史失败')
  } finally {
    historyLoading.value = false
  }
}

function onHistoryPageChange(p) {
  historyPage.value = p
  loadHistory()
}

onMounted(() => loadHistory())
</script>

<style scoped>
.voucher-result { margin-top: 16px; }
.redeem-action { margin-top: 16px; text-align: center; }
</style>
