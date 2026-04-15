<template>
  <div class="page-container">
    <h1>提交任务</h1>
    <!-- 任务提交表单 -->
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()
const postId = route.params.postId
</script>

<style scoped>
</style>
