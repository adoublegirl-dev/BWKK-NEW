<template>
  <div class="shop-page">
    <NavBar title="积分商城" left-arrow @click-left="$router.back()" />
    <div class="content">
      <Empty description="积分商城功能开发中" />
    </div>
  </div>
</template>

<script setup>
import { NavBar, Empty } from 'vant'
</script>

<style scoped>
.shop-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.content {
  padding-top: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
}
</style>
