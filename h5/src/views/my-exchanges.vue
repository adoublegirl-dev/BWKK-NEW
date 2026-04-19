<template>
  <div class="exchanges-page">
    <van-nav-bar title="已兑换" left-arrow @click-left="onClickLeft" />

    <van-tabs v-model:active="activeTab" @change="onTabChange">
      <van-tab title="全部" name="all" />
      <van-tab title="商品" name="shop_product" />
      <van-tab title="代金券" name="voucher" />
    </van-tabs>

    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="onLoad">
        <div class="exchange-list">
          <div v-for="item in records" :key="item.id" class="exchange-card">
            <div class="exchange-top">
              <div class="exchange-name">
                <van-tag v-if="item.type === 'voucher'" type="warning" size="medium" style="margin-right:6px;">代金券</van-tag>
                <van-tag v-else type="primary" size="medium" style="margin-right:6px;">商品</van-tag>
                {{ item.productName || `代金券¥${item.faceValue}` }}
              </div>
              <van-tag :type="statusTagType(item.status)" size="small">{{ statusLabel(item.status) }}</van-tag>
            </div>
            <div class="exchange-info">
              <span class="exchange-points">
                <van-icon name="gold-coin-o" color="#ff6034" />
                {{ item.pointsCost }}积分
              </span>
              <span v-if="item.validFrom" class="exchange-valid">
                {{ formatDate(item.validFrom) }} ~ {{ formatDate(item.validUntil) }}
              </span>
            </div>
            <!-- 代金券显示兑换码 -->
            <div v-if="item.redeemCode" class="exchange-code" @click="copyCode(item.redeemCode)">
              <span>兑换码: {{ maskCode(item.redeemCode) }}</span>
              <van-icon name="description" size="14" color="#07c160" />
            </div>
          </div>
        </div>
        <van-empty v-if="records.length === 0 && !loading" description="暂无兑换记录" />
      </van-list>
    </van-pull-refresh>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { getExchangeRecords } from '@/api/shop'

const router = useRouter()
const activeTab = ref('all')
const records = ref([])
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)
const page = ref(1)

function onClickLeft() {
  router.back()
}

const statusMap = {
  valid: { label: '有效', type: 'success' },
  used: { label: '已使用', type: 'default' },
  expired: { label: '已过期', type: 'danger' },
  refunded: { label: '已退款', type: 'warning' },
}
function statusLabel(s) { return statusMap[s]?.label || s }
function statusTagType(s) { return statusMap[s]?.type || 'default' }

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('zh-CN')
}

function maskCode(code) {
  if (!code || code.length < 8) return code
  return code.substring(0, 4) + '****' + code.substring(code.length - 4)
}

function copyCode(code) {
  navigator.clipboard.writeText(code).then(() => {
    showToast('兑换码已复制')
  }).catch(() => {
    showToast('复制失败')
  })
}

async function loadRecords() {
  try {
    const params = {
      page: page.value,
      pageSize: 10,
    }
    if (activeTab.value !== 'all') {
      params.type = activeTab.value
    }
    const res = await getExchangeRecords(params)
    const list = Array.isArray(res) ? res : (res.list || [])

    if (page.value === 1) {
      records.value = list
    } else {
      records.value.push(...list)
    }

    if (list.length < 10) {
      finished.value = true
    }
    page.value++
  } catch (e) {
    showToast('加载失败')
    finished.value = true
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

function onRefresh() {
  page.value = 1
  finished.value = false
  loadRecords()
}

function onLoad() {
  loadRecords()
}

function onTabChange() {
  page.value = 1
  records.value = []
  finished.value = false
  loadRecords()
}

onMounted(() => {})
</script>

<style scoped>
.exchanges-page { min-height: 100vh; background: #f5f5f5; }
.exchange-list { padding: 12px; }
.exchange-card { background: white; border-radius: 12px; padding: 14px; margin-bottom: 10px; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
.exchange-top { display: flex; justify-content: space-between; align-items: center; }
.exchange-name { font-size: 15px; font-weight: 500; color: #333; display: flex; align-items: center; }
.exchange-info { margin-top: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: #999; }
.exchange-points { display: flex; align-items: center; gap: 2px; color: #ff6034; font-weight: 500; }
.exchange-valid { font-size: 12px; }
.exchange-code { margin-top: 8px; padding: 6px 10px; background: #f9f9f9; border-radius: 6px; font-size: 13px; color: #666; display: flex; justify-content: space-between; align-items: center; font-family: monospace; }
</style>
