<template>
  <div class="points-page">
    <van-nav-bar title="积分明细" left-arrow @click-left="onClickLeft" />
    <div class="points-header">
      <div class="total-points">{{ userInfo?.totalPoints || 0 }}</div>
      <div class="points-label">累计获得积分</div>
      <div class="points-sub">冻结: {{ userInfo?.frozenPoints || 0 }} | 可用: {{ availablePoints }}</div>
    </div>
    <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="onLoad">
      <van-cell v-for="item in transactionList" :key="item.id" :title="item.description || typeText(item.type)" :label="formatTime(item.createdAt)" :value="`${amountPrefix(item.type)}${item.amount}`" :class="amountClass(item.type)" />
    </van-list>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useAuthStore } from '@/stores/auth'
import { getPoints } from '@/api/payment'

const router = useRouter()
const authStore = useAuthStore()
const userInfo = computed(() => authStore.userInfo)
const availablePoints = computed(() => authStore.availablePoints)

const transactionList = ref([])
const loading = ref(false)
const finished = ref(false)

const typeMap = { freeze: '冻结积分', unfreeze: '解冻积分', earn: '获得积分', spend: '消费积分', refund: '退还积分', compensate: '补偿积分' }
const typeText = (t) => typeMap[t] || t
const amountPrefix = (t) => ['earn', 'refund', 'compensate', 'unfreeze'].includes(t) ? '+' : '-'
const amountClass = (t) => ({ 'positive': ['earn', 'refund', 'compensate', 'unfreeze'].includes(t), 'negative': ['freeze', 'spend'].includes(t) })
const formatTime = (t) => new Date(t).toLocaleString()

onMounted(() => loadData())
const loadData = async () => {
  loading.value = true
  try {
    const res = await getPoints()
    transactionList.value = Array.isArray(res) ? res : (res.transactions || [])
    finished.value = true
  } catch (error) {
    showToast('加载失败')
  } finally {
    loading.value = false
  }
}
const onLoad = () => {}
const onClickLeft = () => router.back()
</script>

<style scoped>
.points-page { min-height: 100vh; background: #f5f5f5; }
.points-header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 24px; text-align: center; color: white; }
.total-points { font-size: 48px; font-weight: 600; }
.points-label { font-size: 14px; opacity: 0.9; margin-top: 8px; }
.points-sub { font-size: 12px; opacity: 0.8; margin-top: 8px; }
:deep(.positive) .van-cell__value { color: #07c160; }
:deep(.negative) .van-cell__value { color: #ff6b6b; }
</style>