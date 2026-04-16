<template>
  <div class="my-orders-page">
    <van-nav-bar title="我的接单" left-arrow @click-left="onClickLeft" />
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="onLoad">
        <div class="order-list">
          <div
            v-for="order in orderList"
            :key="order.id"
            class="order-card"
            @click="goToPost(order)"
          >
            <div class="order-header">
              <div class="order-left">
                <span
                  v-if="order.dotColor"
                  class="status-dot"
                  :class="`dot-${order.dotColor}`"
                ></span>
                <span class="post-title">{{ order.post?.title || '帮我看看' }}</span>
              </div>
              <van-tag :type="statusType(order.status)">{{ statusText(order.status) }}</van-tag>
            </div>
            <div class="order-info">
              <span class="reward">悬赏: {{ order.post?.rewardAmount }}积分</span>
              <span class="time">{{ formatTime(order.createdAt) }}</span>
            </div>
          </div>
        </div>
        <van-empty v-if="orderList.length === 0 && !loading" description="暂无接单" />
      </van-list>
    </van-pull-refresh>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { getMyOrders, viewOrder } from '@/api/order'

const router = useRouter()
const orderList = ref([])
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)

const statusMap = {
  accepted: { text: '已接单', type: 'primary' },
  submitted: { text: '已提交', type: 'warning' },
  selected: { text: '被选中', type: 'success' },
  rejected: { text: '未选中', type: 'default' },
  expired: { text: '已过期', type: 'default' }
}

const statusText = (s) => statusMap[s]?.text || '未知'
const statusType = (s) => statusMap[s]?.type || 'default'

onMounted(() => loadOrders())

const loadOrders = async () => {
  loading.value = true
  try {
    const res = await getMyOrders()
    orderList.value = res?.list || (Array.isArray(res) ? res : [])
    finished.value = true
  } catch (error) {
    showToast('加载失败')
  } finally {
    loading.value = false
  }
}

const onRefresh = () => { refreshing.value = true; loadOrders().then(() => refreshing.value = false) }
const onLoad = () => {}

const goToPost = async (order) => {
  // 如果是已选中且未查看的订单，先标记为已查看
  if (order.status === 'selected' && order.dotColor === 'green') {
    try {
      await viewOrder(order.id)
      // 更新本地状态为灰点（无需重新加载列表）
      order.dotColor = 'gray'
    } catch {
      // 静默失败
    }
  }
  router.push({ path: `/post/${order.postId}`, query: { from: 'my-orders' } })
}

const formatTime = (t) => new Date(t).toLocaleDateString()
const onClickLeft = () => router.back()
</script>

<style scoped>
.my-orders-page { min-height: 100vh; background: #f5f5f5; }
.order-list { padding: 12px; }
.order-card { background: white; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
.order-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.order-left { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
.post-title { font-size: 16px; font-weight: 500; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.order-info { display: flex; justify-content: space-between; font-size: 13px; color: #999; }
.reward { color: #ff6b6b; }

/* 状态点 */
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.dot-blue { background: #1989fa; }
.dot-green { background: #07c160; }
.dot-gray { background: #c8c9cc; }
</style>
