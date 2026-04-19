<template>
  <div class="merchant-home-page">
    <van-nav-bar title="商家中心" left-arrow @click-left="onClickLeft" />

    <div v-if="isMerchant" class="merchant-content">
      <!-- 商家信息 -->
      <div class="merchant-info">
        <div class="merchant-name">{{ merchantInfo.merchantName || '商家' }}</div>
        <div class="merchant-desc" v-if="merchantInfo.merchantDesc">{{ merchantInfo.merchantDesc }}</div>
        <div class="merchant-points">可用积分: <span class="points-num">{{ authStore.availablePoints }}</span></div>
      </div>

      <!-- 快捷操作 -->
      <van-cell-group inset class="action-group">
        <van-cell title="核销代金券" icon="scan" is-link to="/merchant/redeem" />
        <van-cell title="已兑换记录" icon="exchange" is-link to="/my/exchanges" />
      </van-cell-group>

      <!-- 代金券批次 -->
      <van-cell-group inset class="action-group">
        <van-cell title="我的代金券批次" />
      </van-cell-group>

      <div class="batch-list" v-if="batches.length">
        <div v-for="batch in batches" :key="batch.id" class="batch-card">
          <div class="batch-name">{{ batch.name }}</div>
          <div class="batch-info">
            <span>面值: {{ batch.faceValue }}积分</span>
            <span>已发: {{ batch.distributedQty }}/{{ batch.totalQuantity }}</span>
            <span>剩余: {{ batch.remainingQty }}</span>
          </div>
          <van-tag :type="batch.status === 'active' ? 'success' : 'info'" size="small">
            {{ { active: '有效', disabled: '禁用', expired: '过期' }[batch.status] || batch.status }}
          </van-tag>
        </div>
      </div>
      <van-empty v-else description="暂无代金券批次" />

      <!-- 核销历史 -->
      <van-cell-group inset class="action-group" style="margin-top:12px;">
        <van-cell title="近期核销" />
      </van-cell-group>

      <div class="redeem-list" v-if="redeemHistory.length">
        <div v-for="item in redeemHistory" :key="item.id" class="redeem-item">
          <div class="redeem-code">{{ maskCode(item.redeemCode) }}</div>
          <div class="redeem-time">{{ formatTime(item.redeemedAt) }}</div>
        </div>
      </div>
      <van-empty v-else description="暂无核销记录" :image-size="60" />
    </div>

    <div v-else class="not-merchant">
      <van-empty description="您不是商家用户" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useAuthStore } from '@/stores/auth'
import { getMerchantProfile, getMerchantBatches, getRedeemHistory } from '@/api/shop'

const router = useRouter()
const authStore = useAuthStore()

const isMerchant = computed(() => authStore.userInfo?.role === 'merchant')
const merchantInfo = computed(() => authStore.userInfo || {})
const batches = ref([])
const redeemHistory = ref([])

function onClickLeft() {
  router.back()
}

function maskCode(code) {
  if (!code || code.length < 8) return code
  return code.substring(0, 4) + '****' + code.substring(code.length - 4)
}

function formatTime(d) {
  if (!d) return ''
  return new Date(d).toLocaleString('zh-CN')
}

async function loadData() {
  if (!isMerchant.value) return
  try {
    const [batchRes, historyRes] = await Promise.all([
      getMerchantBatches({ pageSize: 10 }),
      getRedeemHistory({ pageSize: 10 }),
    ])
    batches.value = Array.isArray(batchRes) ? batchRes : (batchRes.list || [])
    redeemHistory.value = Array.isArray(historyRes) ? historyRes : (historyRes.list || [])
  } catch (e) {
    console.error('加载商家数据失败', e)
  }
}

onMounted(loadData)
</script>

<style scoped>
.merchant-home-page { min-height: 100vh; background: #f5f5f5; }
.merchant-info { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 24px; color: white; }
.merchant-name { font-size: 20px; font-weight: 600; }
.merchant-desc { font-size: 13px; opacity: 0.9; margin-top: 4px; }
.merchant-points { margin-top: 8px; font-size: 14px; }
.merchant-points .points-num { font-size: 20px; font-weight: 700; }
.action-group { margin-top: 12px; }
.batch-list { padding: 0 16px; }
.batch-card { background: white; border-radius: 10px; padding: 12px; margin-bottom: 8px; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
.batch-name { font-size: 15px; font-weight: 500; color: #333; }
.batch-info { margin-top: 6px; font-size: 12px; color: #999; display: flex; gap: 12px; }
.redeem-list { padding: 0 16px; }
.redeem-item { background: white; border-radius: 8px; padding: 10px 12px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
.redeem-code { font-family: monospace; color: #333; }
.redeem-time { color: #999; font-size: 12px; }
.not-merchant { padding-top: 100px; }
</style>
