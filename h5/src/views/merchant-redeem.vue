<template>
  <div class="merchant-redeem-page">
    <van-nav-bar title="核销代金券" left-arrow @click-left="onClickLeft" />

    <div class="redeem-content">
      <!-- 兑换码输入 -->
      <van-cell-group inset>
        <van-field
          v-model="redeemCode"
          label="兑换码"
          placeholder="请输入16位兑换码"
          maxlength="16"
          clearable
        />
        <div style="padding: 12px 16px;">
          <van-button round block type="primary" @click="queryVoucher" :loading="querying">
            查询
          </van-button>
        </div>
      </van-cell-group>

      <!-- 查询结果 -->
      <van-cell-group inset v-if="voucherInfo" class="result-group">
        <van-cell title="兑换码" :value="voucherInfo.redeemCode" />
        <van-cell title="面值" :value="`${voucherInfo.faceValue}积分`" />
        <van-cell title="持有人" :value="voucherInfo.user?.nickname || '未知'" />
        <van-cell title="状态">
          <template #value>
            <van-tag :type="voucherInfo.status === 'unused' ? 'success' : 'danger'" size="small">
              {{ { unused: '未使用', used: '已使用', expired: '已过期' }[voucherInfo.status] }}
            </van-tag>
          </template>
        </van-cell>
        <van-cell v-if="voucherInfo.validFrom" title="有效期" :value="formatDate(voucherInfo.validFrom) + ' ~ ' + formatDate(voucherInfo.validUntil)" />
      </van-cell-group>

      <!-- 核销按钮 -->
      <div class="redeem-action" v-if="voucherInfo && voucherInfo.status === 'unused'">
        <van-button round block type="danger" @click="handleRedeem" :loading="redeeming">
          确认核销
        </van-button>
      </div>

      <!-- 历史记录 -->
      <van-cell-group inset class="history-group">
        <van-cell title="核销历史" />
      </van-cell-group>

      <div class="history-list" v-if="history.length">
        <div v-for="item in history" :key="item.id" class="history-item">
          <div class="history-code">{{ item.redeemCode }}</div>
          <div class="history-info">
            <span>面值: {{ item.faceValue }}积分</span>
            <span>{{ formatTime(item.redeemedAt) }}</span>
          </div>
        </div>
      </div>
      <van-empty v-else description="暂无核销记录" :image-size="60" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showSuccessToast, showFailToast, showConfirmDialog } from 'vant'
import { redeemVoucher, getRedeemHistory } from '@/api/shop'
import request from '@/utils/request'

const router = useRouter()
const redeemCode = ref('')
const querying = ref(false)
const redeeming = ref(false)
const voucherInfo = ref(null)
const history = ref([])

function onClickLeft() {
  router.back()
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('zh-CN')
}

function formatTime(d) {
  if (!d) return ''
  return new Date(d).toLocaleString('zh-CN')
}

async function queryVoucher() {
  if (!redeemCode.value || redeemCode.value.length < 8) {
    showFailToast('请输入有效的兑换码')
    return
  }
  querying.value = true
  voucherInfo.value = null
  try {
    // 查询代金券详情（通过商家API）
    const res = await request.get(`/merchant/voucher-codes/${redeemCode.value}`)
    voucherInfo.value = res
  } catch (e) {
    showFailToast(e.message || '查询失败')
  } finally {
    querying.value = false
  }
}

async function handleRedeem() {
  try {
    await showConfirmDialog({
      title: '确认核销',
      message: `确定核销兑换码 ${redeemCode.value} 的代金券吗？`,
      confirmButtonText: '确认核销',
      cancelButtonText: '取消',
    })
    redeeming.value = true
    await redeemVoucher({ redeemCode: redeemCode.value })
    showSuccessToast('核销成功')
    voucherInfo.value = null
    redeemCode.value = ''
    loadHistory()
  } catch (e) {
    if (e !== 'cancel') {
      showFailToast(e.message || '核销失败')
    }
  } finally {
    redeeming.value = false
  }
}

async function loadHistory() {
  try {
    const res = await getRedeemHistory({ pageSize: 20 })
    history.value = Array.isArray(res) ? res : (res.list || [])
  } catch (e) {
    console.error('加载核销历史失败', e)
  }
}

onMounted(loadHistory)
</script>

<style scoped>
.merchant-redeem-page { min-height: 100vh; background: #f5f5f5; }
.redeem-content { padding-top: 12px; }
.result-group { margin-top: 12px; }
.redeem-action { padding: 16px; }
.history-group { margin-top: 12px; }
.history-list { padding: 0 16px; }
.history-item { background: white; border-radius: 8px; padding: 10px 12px; margin-bottom: 6px; }
.history-code { font-size: 14px; font-weight: 500; color: #333; font-family: monospace; }
.history-info { margin-top: 4px; font-size: 12px; color: #999; display: flex; justify-content: space-between; }
</style>
