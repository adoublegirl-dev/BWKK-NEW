<template>
  <div class="dashboard">
    <!-- 统计卡片 -->
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #667eea, #764ba2)">
            <el-icon :size="28"><Document /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.postCount }}</div>
            <div class="stat-label">我的帖子</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #f093fb, #f5576c)">
            <el-icon :size="28"><Ticket /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.batchCount }}</div>
            <div class="stat-label">代金券批次</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #4facfe, #00f2fe)">
            <el-icon :size="28"><Stamp /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.redeemedCount }}</div>
            <div class="stat-label">已核销</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #43e97b, #38f9d7)">
            <el-icon :size="28"><Coin /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.availablePoints }}</div>
            <div class="stat-label">可用积分</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 快捷操作 -->
    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header><span>快捷操作</span></template>
          <div class="quick-actions">
            <el-button type="primary" @click="router.push('/vouchers')">
              <el-icon><Plus /></el-icon> 创建代金券
            </el-button>
            <el-button type="success" @click="router.push('/redeem')">
              <el-icon><Stamp /></el-icon> 核销代金券
            </el-button>
            <el-button @click="router.push('/posts')">
              <el-icon><EditPen /></el-icon> 发布帖子
            </el-button>
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header><span>近期核销</span></template>
          <el-table :data="recentRedeems" stripe size="small" v-if="recentRedeems.length">
            <el-table-column prop="redeemCode" label="兑换码" width="160" />
            <el-table-column prop="faceValue" label="面值" width="80" />
            <el-table-column prop="redeemedAt" label="核销时间" />
          </el-table>
          <el-empty v-else description="暂无核销记录" :image-size="60" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getVoucherBatches, getRedeemHistory, getMerchantPosts } from '../api/merchant'
import { useMerchantStore } from '../stores/auth'

const router = useRouter()
const merchantStore = useMerchantStore()

const stats = ref({
  postCount: 0,
  batchCount: 0,
  redeemedCount: 0,
  availablePoints: 0
})

const recentRedeems = ref([])

onMounted(async () => {
  try {
    // 并行加载
    const [postsRes, batchesRes, redeemRes] = await Promise.allSettled([
      getMerchantPosts({ page: 1, pageSize: 1 }),
      getVoucherBatches({ page: 1, pageSize: 1 }),
      getRedeemHistory({ page: 1, pageSize: 5 })
    ])

    if (postsRes.status === 'fulfilled') {
      stats.value.postCount = postsRes.value.data?.total || postsRes.value.data?.length || 0
    }
    if (batchesRes.status === 'fulfilled') {
      stats.value.batchCount = batchesRes.value.data?.total || batchesRes.value.data?.length || 0
      // 累计已核销
      const batches = batchesRes.value.data?.list || batchesRes.value.data || []
      stats.value.redeemedCount = batches.reduce((sum, b) => sum + (b.distributedQty - b.remainingQty), 0)
    }
    if (redeemRes.status === 'fulfilled') {
      recentRedeems.value = redeemRes.value.data?.list || redeemRes.value.data || []
    }

    // 可用积分从profile获取
    if (merchantStore.merchantInfo) {
      const info = merchantStore.merchantInfo
      stats.value.availablePoints = (info.totalPoints || 0) - (info.frozenPoints || 0)
    }
  } catch (e) {
    console.error('加载概览数据失败', e)
  }
})
</script>

<style scoped>
.stat-card { display: flex; align-items: center; }
.stat-card :deep(.el-card__body) { display: flex; align-items: center; gap: 16px; width: 100%; }
.stat-icon { width: 56px; height: 56px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0; }
.stat-info { flex: 1; }
.stat-value { font-size: 28px; font-weight: 700; color: #333; }
.stat-label { font-size: 13px; color: #999; margin-top: 4px; }
.quick-actions { display: flex; gap: 12px; flex-wrap: wrap; }
</style>
