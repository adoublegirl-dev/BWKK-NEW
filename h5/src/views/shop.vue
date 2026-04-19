<template>
  <div class="shop-page">
    <van-nav-bar title="积分商城" left-arrow @click-left="onClickLeft" />

    <!-- 搜索 + 视图切换 -->
    <div class="shop-header">
      <van-search v-model="searchKeyword" placeholder="搜索商品" shape="round" @search="onSearch" />
      <van-icon :name="viewMode === 'grid' ? 'bars' : 'grid-o'" class="view-toggle" @click="toggleView" />
    </div>

    <!-- 分类导航 -->
    <div class="category-bar" v-if="categories.length">
      <div class="category-scroll">
        <div
          :class="['category-tag', { active: !currentCategory }]"
          @click="onCategoryChange(null)"
        >全部</div>
        <div
          v-for="cat in categories"
          :key="cat.id"
          :class="['category-tag', { active: currentCategory === cat.id }]"
          @click="onCategoryChange(cat.id)"
        >{{ cat.name }}</div>
      </div>
    </div>

    <!-- 排序栏 -->
    <div class="sort-bar">
      <div
        v-for="item in sortOptions"
        :key="item.value"
        :class="['sort-item', { active: currentSort === item.value }]"
        @click="onSortChange(item.value)"
      >{{ item.label }}</div>
    </div>

    <!-- 商品列表 -->
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="onLoad">
        <!-- 网格视图 -->
        <div v-if="viewMode === 'grid'" class="product-grid">
          <div v-for="item in products" :key="item.id" class="product-card-grid" @click="goToDetail(item)">
            <div class="product-img-grid">
              <van-image v-if="getFirstImage(item.images)" :src="getFirstImage(item.images)" fit="cover" width="100%" height="100%" />
              <van-icon v-else name="gift-o" size="48" color="#ccc" />
            </div>
            <div class="product-info-grid">
              <div class="product-name">{{ item.name }}</div>
              <div class="product-points">
                <van-icon name="gold-coin-o" color="#ff6034" />
                {{ item.pointsPrice }}积分
              </div>
              <div class="product-stock">剩余{{ item.remainingCount }}</div>
            </div>
          </div>
        </div>

        <!-- 列表视图 -->
        <div v-else class="product-list">
          <div v-for="item in products" :key="item.id" class="product-card-list" @click="goToDetail(item)">
            <div class="product-img-list">
              <van-image v-if="getFirstImage(item.images)" :src="getFirstImage(item.images)" fit="cover" width="80" height="80" radius="8" />
              <van-icon v-else name="gift-o" size="40" color="#ccc" />
            </div>
            <div class="product-info-list">
              <div class="product-name">{{ item.name }}</div>
              <div class="product-desc">{{ item.description }}</div>
              <div class="product-bottom">
                <span class="product-points">
                  <van-icon name="gold-coin-o" color="#ff6034" />
                  {{ item.pointsPrice }}积分
                </span>
                <span class="product-stock">剩余{{ item.remainingCount }}</span>
              </div>
            </div>
          </div>
        </div>

        <van-empty v-if="products.length === 0 && !loading" description="暂无商品" />
      </van-list>
    </van-pull-refresh>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { getShopProducts, getCategories } from '@/api/shop'

const router = useRouter()
const searchKeyword = ref('')
const viewMode = ref('grid')
const currentCategory = ref(null)
const currentSort = ref('latest')
const products = ref([])
const categories = ref([])
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)
const page = ref(1)

const sortOptions = [
  { label: '最新', value: 'latest' },
  { label: '最热', value: 'popular' },
  { label: '积分↑', value: 'points_asc' },
  { label: '积分↓', value: 'points_desc' },
]

function onClickLeft() {
  router.back()
}

function getFirstImage(imagesStr) {
  if (!imagesStr) return ''
  try {
    const arr = JSON.parse(imagesStr)
    return arr[0] || ''
  } catch {
    return ''
  }
}

function toggleView() {
  viewMode.value = viewMode.value === 'grid' ? 'list' : 'grid'
}

async function loadCategories() {
  try {
    const res = await getCategories()
    categories.value = Array.isArray(res) ? res : (res.list || [])
  } catch (e) {
    console.error('加载分类失败', e)
  }
}

async function loadProducts() {
  try {
    const params = {
      page: page.value,
      pageSize: 10,
      sort: currentSort.value,
      keyword: searchKeyword.value || undefined,
      categoryId: currentCategory.value || undefined,
    }
    const res = await getShopProducts(params)
    const list = Array.isArray(res) ? res : (res.list || [])

    if (page.value === 1) {
      products.value = list
    } else {
      products.value.push(...list)
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
  loadProducts()
}

function onLoad() {
  loadProducts()
}

function onSearch() {
  page.value = 1
  products.value = []
  finished.value = false
  loadProducts()
}

function onSortChange(sort) {
  currentSort.value = sort
  page.value = 1
  products.value = []
  finished.value = false
  loadProducts()
}

function onCategoryChange(catId) {
  currentCategory.value = catId
  page.value = 1
  products.value = []
  finished.value = false
  loadProducts()
}

function goToDetail(item) {
  router.push(`/shop/${item.id}`)
}

onMounted(() => {
  loadCategories()
})
</script>

<style scoped>
.shop-page { min-height: 100vh; background: #f5f5f5; }
.shop-header { display: flex; align-items: center; background: white; padding-right: 12px; }
.shop-header :deep(.van-search) { flex: 1; padding: 0; }
.view-toggle { font-size: 22px; color: #666; padding: 8px; }

.category-bar { background: white; border-bottom: 1px solid #f0f0f0; }
.category-scroll { display: flex; overflow-x: auto; padding: 8px 12px; gap: 8px; -webkit-overflow-scrolling: touch; }
.category-scroll::-webkit-scrollbar { display: none; }
.category-tag { white-space: nowrap; padding: 4px 14px; border-radius: 14px; font-size: 13px; color: #666; background: #f5f5f5; }
.category-tag.active { color: #07c160; background: rgba(7,193,96,0.1); font-weight: 500; }

.sort-bar { display: flex; padding: 8px 12px; background: white; gap: 6px; border-bottom: 1px solid #f0f0f0; }
.sort-item { padding: 4px 12px; border-radius: 12px; font-size: 12px; color: #666; background: #f5f5f5; }
.sort-item.active { color: #07c160; background: rgba(7,193,96,0.1); font-weight: 500; }

.product-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 12px; }
.product-card-grid { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
.product-img-grid { height: 140px; display: flex; align-items: center; justify-content: center; background: #f9f9f9; }
.product-info-grid { padding: 8px 10px 10px; }
.product-info-grid .product-name { font-size: 14px; font-weight: 500; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.product-info-grid .product-points { font-size: 14px; color: #ff6034; font-weight: 600; margin-top: 4px; display: flex; align-items: center; gap: 2px; }
.product-info-grid .product-stock { font-size: 11px; color: #999; margin-top: 2px; }

.product-list { padding: 12px; }
.product-card-list { display: flex; background: white; border-radius: 12px; padding: 12px; margin-bottom: 10px; gap: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
.product-img-list { flex-shrink: 0; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; background: #f9f9f9; border-radius: 8px; overflow: hidden; }
.product-info-list { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: space-between; }
.product-info-list .product-name { font-size: 15px; font-weight: 500; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.product-info-list .product-desc { font-size: 12px; color: #999; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 4px; }
.product-info-list .product-bottom { display: flex; justify-content: space-between; align-items: center; margin-top: 6px; }
.product-info-list .product-points { font-size: 14px; color: #ff6034; font-weight: 600; display: flex; align-items: center; gap: 2px; }
.product-info-list .product-stock { font-size: 11px; color: #999; }
</style>
