<template>
  <div class="page-container">
    <h1>帖子详情</h1>
    <!-- 帖子详情内容 -->
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()
const postId = route.params.id
</script>

<style scoped>
</style>
