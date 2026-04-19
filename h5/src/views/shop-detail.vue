<template>
  <div class="shop-detail-page">
    <van-nav-bar title="商品详情" left-arrow @click-left="onClickLeft" />

    <div v-if="product" class="detail-content">
      <!-- 图片轮播 -->
      <div class="image-swiper">
        <van-swipe :autoplay="3000" indicator-color="#07c160" v-if="imageList.length">
          <van-swipe-item v-for="(img, idx) in imageList" :key="idx">
            <van-image :src="img" fit="cover" width="100%" height="300" />
          </van-swipe-item>
        </van-swipe>
        <div v-else class="no-image">
          <van-icon name="gift-o" size="64" color="#ccc" />
        </div>
      </div>

      <!-- 商品信息 -->
      <div class="product-info">
        <div class="product-name">{{ product.name }}</div>
        <div class="product-points">
          <van-icon name="gold-coin-o" color="#ff6034" />
          <span class="points-num">{{ product.pointsPrice }}</span>
          <span class="points-label">积分</span>
        </div>
      </div>

      <!-- 兑换信息 -->
      <van-cell-group inset class="info-group">
        <van-cell title="剩余数量" :value="`${product.remainingCount}件`" />
        <van-cell title="已兑换" :value="`${product.exchangedCount}件`" />
        <van-cell v-if="product.validFrom" title="可兑日期" :value="formatDate(product.validFrom) + ' ~ ' + formatDate(product.validUntil)" />
        <van-cell v-if="locationText" title="地区" :value="locationText" />
        <van-cell v-if="product.category" title="分类" :value="product.category?.name || '-'" />
      </van-cell-group>

      <!-- 商品描述 -->
      <van-cell-group inset class="info-group" v-if="product.description">
        <van-cell title="商品描述" />
        <div class="description-content">{{ product.description }}</div>
      </van-cell-group>
    </div>

    <!-- 加载中 -->
    <div v-else class="loading-box">
      <van-loading size="24px" vertical>加载中...</van-loading>
    </div>

    <!-- 底部兑换按钮 -->
    <div class="bottom-bar">
      <div class="points-info">
        可用积分: <span class="my-points">{{ authStore.availablePoints }}</span>
      </div>
      <van-button
        round
        type="primary"
        :disabled="!canExchange"
        :loading="exchanging"
        @click="handleExchange"
      >
        {{ exchangeBtnText }}
      </van-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showSuccessToast, showFailToast, showConfirmDialog } from 'vant'
import { useAuthStore } from '@/stores/auth'
import { getShopProductDetail, exchangeProduct } from '@/api/shop'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const product = ref(null)
const exchanging = ref(false)

const imageList = computed(() => {
  if (!product.value?.images) return []
  try {
    return JSON.parse(product.value.images)
  } catch {
    return []
  }
})

const locationText = computed(() => {
  if (!product.value) return ''
  return [product.value.province, product.value.city, product.value.district].filter(Boolean).join(' ')
})

const canExchange = computed(() => {
  if (!product.value) return false
  if (product.value.status !== 'active') return false
  if (product.value.remainingCount <= 0) return false
  return authStore.availablePoints >= product.value.pointsPrice
})

const exchangeBtnText = computed(() => {
  if (!product.value) return '加载中...'
  if (product.value.status !== 'active') return '已下架'
  if (product.value.remainingCount <= 0) return '已售罄'
  if (authStore.availablePoints < product.value.pointsPrice) return '积分不足'
  return '立即兑换'
})

function onClickLeft() {
  router.back()
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('zh-CN')
}

async function loadProduct() {
  try {
    const id = route.params.id
    const res = await getShopProductDetail(id)
    product.value = res
  } catch (e) {
    showFailToast('加载失败')
  }
}

async function handleExchange() {
  try {
    await showConfirmDialog({
      title: '确认兑换',
      message: `确定消耗 ${product.value.pointsPrice} 积分兑换"${product.value.name}"吗？`,
      confirmButtonText: '确认兑换',
      cancelButtonText: '取消',
    })
    exchanging.value = true
    await exchangeProduct(product.value.id)
    showSuccessToast('兑换成功')
    // 刷新用户积分
    authStore.fetchUserInfo()
    // 1.5秒后跳转到已兑换页
    setTimeout(() => {
      window.location.replace('/my/exchanges')
    }, 1500)
  } catch (e) {
    if (e !== 'cancel') {
      showFailToast(e.message || '兑换失败')
    }
  } finally {
    exchanging.value = false
  }
}

onMounted(loadProduct)
</script>

<style scoped>
.shop-detail-page { min-height: 100vh; background: #f5f5f5; padding-bottom: 70px; }
.image-swiper { background: white; }
.no-image { height: 300px; display: flex; align-items: center; justify-content: center; background: #f9f9f9; }
.product-info { background: white; padding: 16px; }
.product-name { font-size: 18px; font-weight: 600; color: #333; }
.product-points { margin-top: 8px; display: flex; align-items: baseline; gap: 4px; }
.points-num { font-size: 24px; color: #ff6034; font-weight: 700; }
.points-label { font-size: 14px; color: #ff6034; }
.info-group { margin-top: 12px; }
.description-content { padding: 12px 16px; font-size: 14px; color: #666; line-height: 1.8; background: white; }
.loading-box { display: flex; justify-content: center; padding-top: 100px; }
.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; background: white; box-shadow: 0 -2px 8px rgba(0,0,0,0.06); z-index: 100; }
.points-info { font-size: 14px; color: #666; }
.my-points { color: #ff6034; font-weight: 600; }
.bottom-bar :deep(.van-button) { min-width: 120px; }
</style>
