<template>
  <div class="profile-page">
    <el-card shadow="hover">
      <template #header><span>商家信息</span></template>
      <el-form :model="form" label-width="100px" v-loading="loading">
        <el-form-item label="邮箱">
          <el-input :model-value="merchantStore.merchantInfo?.email" disabled />
        </el-form-item>
        <el-form-item label="商家名称">
          <el-input v-model="form.merchantName" placeholder="请输入商家名称" />
        </el-form-item>
        <el-form-item label="商家描述">
          <el-input v-model="form.merchantDesc" type="textarea" :rows="3" placeholder="请输入商家描述" />
        </el-form-item>
        <el-form-item label="联系方式">
          <el-input v-model="form.merchantContact" placeholder="请输入联系方式" />
        </el-form-item>
        <el-form-item label="可用积分">
          <el-input :model-value="availablePoints" disabled />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onSave" :loading="saving">保存修改</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useMerchantStore } from '../stores/auth'
import { updateMerchantProfile } from '../api/merchant'

const merchantStore = useMerchantStore()
const loading = ref(false)
const saving = ref(false)

const form = reactive({
  merchantName: '',
  merchantDesc: '',
  merchantContact: ''
})

const availablePoints = computed(() => {
  const info = merchantStore.merchantInfo
  if (!info) return 0
  return (info.totalPoints || 0) - (info.frozenPoints || 0)
})

async function loadProfile() {
  loading.value = true
  try {
    await merchantStore.fetchProfile()
    const info = merchantStore.merchantInfo
    if (info) {
      form.merchantName = info.merchantName || ''
      form.merchantDesc = info.merchantDesc || ''
      form.merchantContact = info.merchantContact || ''
    }
  } finally {
    loading.value = false
  }
}

async function onSave() {
  if (!form.merchantName.trim()) {
    ElMessage.warning('商家名称不能为空')
    return
  }
  saving.value = true
  try {
    await updateMerchantProfile(form)
    ElMessage.success('保存成功')
    merchantStore.fetchProfile()
  } catch (e) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(() => loadProfile())
</script>

<style scoped>
</style>
