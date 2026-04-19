<template>
  <div class="home-page">
    <!-- 顶部搜索栏 -->
    <div class="search-header">
      <van-search
        v-model="searchKeyword"
        placeholder="搜索帖子"
        shape="round"
        @search="onSearch"
      />
      <van-icon name="location-o" class="location-icon" @click="refreshLocation" />
      <van-icon name="user-o" class="user-icon" @click="goToProfile" />
    </div>
    
    <!-- 位置信息 -->
    <div v-if="currentLocation" class="location-bar">
      <van-icon name="location" color="#07c160" />
      <span class="location-text">{{ currentLocation.name || '当前位置' }}</span>
      <span v-if="locationLoading" class="location-loading">定位中...</span>
    </div>
    
    <!-- 排序选项 -->
    <div class="sort-bar">
      <div
        v-for="item in sortOptions"
        :key="item.value"
        :class="['sort-item', { active: currentSort === item.value }]"
        @click="onSortChange(item.value)"
      >
        <van-icon :name="item.icon" />
        <span>{{ item.label }}</span>
      </div>
    </div>

    <!-- 帖子列表 -->
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list
        v-model:loading="loading"
        :finished="finished"
        finished-text="没有更多了"
        @load="onLoad"
      >
        <div class="post-list">
          <PostCard
            v-for="post in postList"
            :key="post.id"
            :post="post"
            :user-location="currentLocation"
            @click="goToDetail(post)"
          />
        </div>
        
        <van-empty v-if="postList.length === 0 && !loading" description="暂无帖子" />
      </van-list>
    </van-pull-refresh>
  </div>
</template>

<script setup>
import { ref, onMounted, onActivated, onDeactivated, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast } from 'vant'
import PostCard from '@/components/PostCard.vue'
import { getPosts } from '@/api/post'

// 显式声明组件名，匹配 keep-alive :include="['Home']"
defineOptions({ name: 'Home' })

const router = useRouter()
const route = useRoute()

const searchKeyword = ref('')
const postList = ref([])
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)
const currentLocation = ref(null)
const locationLoading = ref(false)
const locationAttempted = ref(false)
const page = ref(1)
const currentSort = ref('latest')

// 防止 van-list @load 和手动调用 loadPosts 并发导致帖子重复
let isLoading = false

const sortOptions = [
  { label: '最新', value: 'latest', icon: 'clock-o' },
  { label: '赏金', value: 'reward', icon: 'gold-coin-o' },
  { label: '距离', value: 'nearest', icon: 'location-o' },
  { label: '商家', value: 'merchant', icon: 'shop-o' },
]


// 防止 van-list @load 和手动调用 loadPosts 并发导致帖子重复
// - 从发布页返回（query.refresh=1）→ 刷新列表以显示新帖子
// - 从详情页返回 → 保持当前列表状态和滚动位置
// - TabBar再次点击首页 → 通过自定义事件触发刷新
onActivated(() => {
  if (route.query.refresh === '1') {
    // 清理 URL 参数（不触发路由导航）
    window.history.replaceState({}, '', '/')
    nextTick(() => {
      onRefresh()
    })
  }
  // 否则保持当前状态，不刷新
})

// 监听 TabBar 首页重复点击刷新事件
const onHomeRefresh = () => {
  currentSort.value = 'latest'
  onRefresh()
}
onMounted(() => {
  window.addEventListener('home-refresh', onHomeRefresh)
  // 只在首次进入时尝试自动定位
  if (!locationAttempted.value) {
    getCurrentLocation()
  }
  // 首次加载时也检查刷新参数（兜底 onActivated 未触发的情况）
  if (route.query.refresh === '1') {
    window.history.replaceState({}, '', '/')
    nextTick(() => {
      onRefresh()
    })
  }
})
onDeactivated(() => {
  window.removeEventListener('home-refresh', onHomeRefresh)
})

// 获取当前定位
// force: true 时强制重试（用户手动点击），false 时只在首次尝试
const getCurrentLocation = async (force = false) => {
  // 已经尝试过且未获取到定位时，非强制调用直接跳过
  if (locationAttempted.value && !currentLocation.value && !force) {
    return
  }
  
  locationLoading.value = true
  locationAttempted.value = true
  
  try {
    const position = await getBrowserLocation()
    
    currentLocation.value = {
      latitude: position.latitude,
      longitude: position.longitude,
      name: '定位中...'
    }
    
    // 反向地理编码获取地址名称（确保插件已加载）
    if (window.AMap) {
      window.AMap.plugin(['AMap.Geocoder'], () => {
        try {
          const geocoder = new window.AMap.Geocoder()
          geocoder.getAddress([position.longitude, position.latitude], (status, result) => {
            if (status === 'complete' && result.regeocode) {
              currentLocation.value = {
                ...currentLocation.value,
                name: result.regeocode.formattedAddress || '当前位置'
              }
            } else {
              console.warn('逆地理编码返回非 complete 状态:', status)
              currentLocation.value = {
                ...currentLocation.value,
                name: '当前位置'
              }
            }
          })
        } catch (e) {
          console.error('逆地理编码异常:', e)
          currentLocation.value = { ...currentLocation.value, name: '当前位置' }
        }
      })
    }
  } catch (error) {
    console.warn('定位失败:', error.message || error.code)
    // 自动定位失败时不弹 Toast 避免打扰，用户可手动点击刷新
    if (force) {
      showToast('定位失败，请检查定位权限')
    }
  } finally {
    locationLoading.value = false
  }
}

// 浏览器定位（高精度失败后自动降级低精度）
const getBrowserLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('浏览器不支持定位'))
      return
    }
    
    // 先尝试高精度定位
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude })
      },
      (error) => {
        // 高精度失败，降级低精度重试（timeout/position_unavailable 时重试）
        if (error.code === error.TIMEOUT || error.code === error.POSITION_UNAVAILABLE) {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
            (err) => reject(err),
            { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
          )
        } else {
          reject(error)
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  })
}

// 刷新定位（用户手动点击）
const refreshLocation = () => {
  getCurrentLocation(true)
}

// 加载帖子列表（由 van-list @load 驱动，不要手动调用 loading guard）
const loadPosts = async () => {
  // 防止 van-list @load 和手动调用（onSortChange/onSearch）并发
  if (isLoading) return
  isLoading = true
  
  try {
    const params = {
      page: page.value,
      pageSize: 10,
      sort: currentSort.value === 'merchant' ? 'latest' : currentSort.value,
      keyword: searchKeyword.value || undefined,
      latitude: currentLocation.value?.latitude,
      longitude: currentLocation.value?.longitude
    }
    
    // 商家tab筛选
    if (currentSort.value === 'merchant') {
      params.postType = 'merchant'
    }
    
    const res = await getPosts(params)
    // 拦截器已提取 res.data，getPosts 经过 successWithPagination 返回的是数组
    const list = Array.isArray(res) ? res : (res.list || [])
    
    // 第一页（排序切换/搜索/刷新）替换列表，后续页追加
    if (page.value === 1) {
      postList.value = list
    } else {
      postList.value.push(...list)
    }
    
    if (list.length < 10) {
      finished.value = true
    }
    
    page.value++
  } catch (error) {
    // 401 错误会在 request 拦截器中处理，这里不需要额外提示
    if (error.response?.status !== 401) {
      showToast('加载失败')
    }
    // 出错时结束加载状态，避免一直显示加载中
    finished.value = true
  } finally {
    isLoading = false
    loading.value = false
    refreshing.value = false
  }
}

// 下拉刷新
const onRefresh = () => {
  page.value = 1
  finished.value = false
  loadPosts()
}

// 加载更多
const onLoad = () => {
  loadPosts()
}

// 搜索
const onSearch = () => {
  page.value = 1
  postList.value = []
  finished.value = false
  loadPosts()
}

// 切换排序（允许重复点击当前排序刷新数据）
const onSortChange = (sort) => {
  if (sort === 'nearest' && !currentLocation.value) {
    showToast('请先开启定位权限')
    return
  }
  // 商家tab不需要定位
  currentSort.value = sort
  page.value = 1
  postList.value = []
  finished.value = false
  loadPosts()
}

// 跳转到详情
const goToDetail = (post) => {
  router.push(`/post/${post.id}`)
}

// 跳转到个人中心
const goToProfile = () => {
  router.push('/profile')
}
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.search-header {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: white;
}

.search-header :deep(.van-search) {
  flex: 1;
  padding: 0;
}

.location-icon {
  font-size: 24px;
  color: #07c160;
  margin-left: 12px;
  padding: 8px;
}

.user-icon {
  font-size: 24px;
  color: #666;
  margin-left: 8px;
  padding: 8px;
}

.location-bar {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  background: white;
  border-top: 1px solid #f0f0f0;
  font-size: 13px;
  color: #666;
}

.location-text {
  margin-left: 4px;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.location-loading {
  color: #999;
  font-size: 12px;
}

.post-list {
  padding: 12px;
}

.sort-bar {
  display: flex;
  padding: 8px 16px;
  background: white;
  gap: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.sort-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  border-radius: 16px;
  font-size: 13px;
  color: #666;
  background: #f5f5f5;
  cursor: pointer;
  transition: all 0.2s;
}

.sort-item.active {
  color: #07c160;
  background: rgba(7, 193, 96, 0.1);
  font-weight: 500;
}
</style>