<template>
  <div class="my-posts-page">
    <van-nav-bar title="我的帖子" left-arrow @click-left="onClickLeft" />
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="onLoad">
        <div class="post-list">
          <div
            v-for="post in postList"
            :key="post.id"
            class="post-item-wrapper"
            @click="goToDetail(post)"
          >
            <PostCard :post="post" />
            <van-badge
              v-if="post.unreadSubmissions > 0"
              :content="post.unreadSubmissions"
              class="post-badge"
            />
          </div>
        </div>
        <van-empty v-if="postList.length === 0 && !loading" description="暂无帖子" />
      </van-list>
    </van-pull-refresh>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import PostCard from '@/components/PostCard.vue'
import { getMyPosts } from '@/api/user'

const router = useRouter()
const postList = ref([])
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)

onMounted(() => loadPosts())

const loadPosts = async () => {
  loading.value = true
  try {
    const res = await getMyPosts()
    postList.value = res?.list || (Array.isArray(res) ? res : [])
    finished.value = true
  } catch (error) {
    showToast('加载失败')
  } finally {
    loading.value = false
  }
}

const onRefresh = () => { refreshing.value = true; loadPosts().then(() => refreshing.value = false) }
const onLoad = () => {}
const goToDetail = (post) => router.push(`/post/${post.id}`)
const onClickLeft = () => router.back()
</script>

<style scoped>
.my-posts-page { min-height: 100vh; background: #f5f5f5; }
.post-list { padding: 12px; }
.post-item-wrapper {
  position: relative;
}
.post-badge {
  position: absolute;
  top: 8px;
  right: 8px;
}
</style>
