<template>
  <div class="order-submit-page">
    <van-nav-bar title="提交任务" left-arrow @click-left="onClickLeft" />
    <van-form @submit="onSubmit" class="submit-form">
      <van-cell-group inset>
        <van-field v-model="form.description" name="description" label="任务说明" placeholder="请描述您查看的结果..." rows="4" autosize type="textarea" maxlength="500" show-word-limit :rules="[{ required: true, message: '请填写任务说明' }]" />
      </van-cell-group>
      <van-cell-group inset class="mt-12">
        <div class="uploader-label">图片上传</div>
        <van-uploader v-model="fileList" multiple :max-count="9" :after-read="afterRead" @delete="onDelete" />
      </van-cell-group>
      <div class="submit-btn">
        <van-button round block type="primary" native-type="submit" :loading="submitting">提交任务</van-button>
      </div>
    </van-form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Toast } from 'vant'
import { submitOrder } from '@/api/order'

const route = useRoute()
const router = useRouter()
const postId = route.params.postId

const form = ref({ description: '' })
const fileList = ref([])
const submitting = ref(false)
const uploadedImages = ref([])

const afterRead = async (file) => {
  file.status = 'uploading'
  file.message = '上传中...'
  try {
    const url = await uploadImage(file.file)
    uploadedImages.value.push(url)
    file.status = 'done'
  } catch (error) {
    file.status = 'failed'
    file.message = '上传失败'
  }
}

const uploadImage = (file) => {
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('file', file)
    fetch('/api/upload', { method: 'POST', body: formData })
      .then(res => res.json())
      .then(data => { if (data.code === 0) resolve(data.data.url); else reject(data) })
      .catch(reject)
  })
}

const onDelete = (file, detail) => {
  uploadedImages.value.splice(detail.index, 1)
}

const onSubmit = async () => {
  submitting.value = true
  try {
    await submitOrder(postId, { description: form.value.description, images: uploadedImages.value })
    Toast.success('提交成功')
    router.back()
  } catch (error) {
    Toast.fail(error.message || '提交失败')
  } finally {
    submitting.value = false
  }
}

const onClickLeft = () => router.back()
</script>

<style scoped>
.order-submit-page { min-height: 100vh; background: #f5f5f5; }
.submit-form { padding: 16px 0; }
.mt-12 { margin-top: 12px; }
.uploader-label { padding: 10px 16px; font-size: 14px; color: #646566; }
.submit-btn { padding: 24px 16px; }
</style>