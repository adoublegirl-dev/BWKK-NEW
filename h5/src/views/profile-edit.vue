<template>
  <div class="profile-edit-page">
    <van-nav-bar
      title="编辑资料"
      left-arrow
      @click-left="router.back()"
    />

    <div class="edit-content">
      <!-- 头像 -->
      <div class="avatar-section" @click="chooseAvatar">
        <van-image round width="72" height="72" :src="avatarDisplay" fit="cover" />
        <div class="avatar-edit-hint">
          <van-icon name="photograph" size="16" />
          <span>更换头像</span>
        </div>
        <input
          ref="avatarInput"
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          style="display: none"
          @change="onAvatarChange"
        />
      </div>

      <!-- 表单 -->
      <van-form @submit="handleSave">
        <van-cell-group inset>
          <van-field
            v-model="form.nickname"
            name="nickname"
            label="昵称"
            placeholder="请输入昵称"
            maxlength="20"
            show-word-limit
            :rules="[{ required: true, message: '请输入昵称' }]"
          />
          <van-field
            v-model="form.email"
            label="邮箱"
            placeholder="邮箱"
            readonly
            is-link
            @click="showToast('邮箱不可修改')"
          />
          <van-field
            v-model="form.city"
            name="city"
            label="城市"
            placeholder="请输入所在城市"
            maxlength="50"
          />
        </van-cell-group>

        <div class="submit-btn">
          <van-button
            round
            block
            type="primary"
            native-type="submit"
            :loading="saving"
          >
            保存修改
          </van-button>
        </div>
      </van-form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showSuccessToast, showFailToast } from 'vant'
import { useAuthStore } from '@/stores/auth'
import { getProfile, updateProfile, uploadAvatar } from '@/api/user'

const router = useRouter()
const authStore = useAuthStore()

const form = ref({
  nickname: '',
  email: '',
  city: '',
  avatarUrl: ''
})

const saving = ref(false)
const avatarInput = ref(null)

// 头像显示（有URL显示URL，否则显示默认）
const avatarDisplay = computed(() => {
  return form.value.avatarUrl || 'https://img.yzcdn.cn/vant/cat.jpeg'
})

onMounted(async () => {
  try {
    const res = await getProfile()
    form.value.nickname = res.nickname || ''
    form.value.email = res.email || ''
    form.value.city = res.city || ''
    form.value.avatarUrl = res.avatarUrl || ''
  } catch (error) {
    showFailToast('获取资料失败')
  }
})

// 选择头像
const chooseAvatar = () => {
  avatarInput.value?.click()
}

// 头像变更
const onAvatarChange = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  // 检查文件大小（2MB）
  if (file.size > 2 * 1024 * 1024) {
    showFailToast('图片大小不能超过2MB')
    return
  }

  try {
    const res = await uploadAvatar(file)
    form.value.avatarUrl = res.url
    showSuccessToast('头像上传成功')
  } catch (error) {
    showFailToast(error.message || '头像上传失败')
  }

  // 清空 input 以允许重复选择同一文件
  event.target.value = ''
}

// 保存修改
const handleSave = async () => {
  saving.value = true

  try {
    const data = {
      nickname: form.value.nickname,
      city: form.value.city,
    }

    // 只有头像URL是本地上传路径时才提交
    if (form.value.avatarUrl && form.value.avatarUrl.startsWith('/uploads/')) {
      data.avatarUrl = form.value.avatarUrl
    }

    const res = await updateProfile(data)

    // 更新 store 中的用户信息
    authStore.updateUserInfo({
      nickname: res.nickname,
      avatarUrl: res.avatarUrl,
      city: res.city,
    })

    showSuccessToast('保存成功')
    router.back()
  } catch (error) {
    showFailToast(error.message || '保存失败')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.profile-edit-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.edit-content {
  padding: 16px;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 0;
  background: white;
  border-radius: 12px;
  margin-bottom: 16px;
  cursor: pointer;
}

.avatar-edit-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  font-size: 12px;
  color: #1989fa;
}

.submit-btn {
  margin-top: 24px;
  padding: 0 16px;
}

::deep(.van-cell-group--inset) {
  border-radius: 12px;
  overflow: hidden;
}
</style>
