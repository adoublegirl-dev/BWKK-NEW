<template>
  <div class="my-orders-page">
    <van-nav-bar left-arrow @click-left="onClickLeft">
      <template #title>
        <span>我的接单</span>
        <van-badge v-if="activeCount > 0" :content="activeCount" />
      </template>
    </van-nav-bar>
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="onLoad">
        <div class="order-list">
          <div
            v-for="order in orderList"
            :key="order.id"
            class="order-card"
          >
            <div class="order-header" @click="goToPost(order)">
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
            <div class="order-info" @click="goToPost(order)">
              <span class="reward">悬赏: {{ order.post?.rewardAmount }}积分</span>
              <span class="time">{{ formatTime(order.createdAt) }}</span>
            </div>
            <!-- 已接单状态：显示"去提交"按钮 -->
            <div v-if="order.status === 'accepted'" class="order-action">
              <van-button
                size="small"
                type="primary"
                round
                @click.stop="goToSubmit(order)"
              >
                去提交
              </van-button>
            </div>
          </div>
        </div>
        <van-empty v-if="orderList.length === 0 && !loading" description="暂无接单" />
      </van-list>
    </van-pull-refresh>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
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

// 活跃订单数（进行中/已提交/新被选中未查看），用于导航栏badge
const activeCount = computed(() => {
  return orderList.value.filter(o =>
    o.status === 'accepted' || o.status === 'submitted' ||
    (o.status === 'selected' && o.dotColor === 'green')
  ).length
})

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

// 跳转到帖子详情
const goToPost = async (order) => {
  // 如果是已选中且未查看的订单，先标记为已查看
  if (order.status === 'selected' && order.dotColor === 'green') {
    try {
      await viewOrder(order.id)
      order.dotColor = 'gray'
    } catch {
      // 静默失败
    }
  }
  router.push({ path: `/post/${order.postId}`, query: { from: 'my-orders' } })
}

// 跳转到提交页面
const goToSubmit = (order) => {
  router.push(`/order/submit/${order.postId}`)
}

const formatTime = (t) => new Date(t).toLocaleDateString()
const onClickLeft = () => router.back()
</script>

<style scoped>
.my-orders-page { min-height: 100vh; background: #f5f5f5; }
.order-list { padding: 12px; }
.order-card { background: white; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
.order-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; cursor: pointer; }
.order-left { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
.post-title { font-size: 16px; font-weight: 500; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.order-info { display: flex; justify-content: space-between; font-size: 13px; color: #999; margin-bottom: 8px; cursor: pointer; }
.reward { color: #ff6b6b; }
.order-action { display: flex; justify-content: flex-end; padding-top: 8px; border-top: 1px solid #f5f5f5; }

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
