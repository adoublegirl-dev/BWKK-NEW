<template>
  <div class="post-create-page">
    <van-nav-bar
      title="发布需求"
      left-arrow
      @click-left="onClickLeft"
    />
    
    <van-form @submit="onSubmit" class="post-form">
      <van-cell-group inset>
        <van-field
          v-model="form.title"
          name="title"
          label="标题"
          placeholder="请输入标题（选填）"
          maxlength="50"
          show-word-limit
        />
        
        <van-field
          v-model="form.description"
          name="description"
          label="需求描述"
          placeholder="请详细描述您需要帮忙查看的内容..."
          rows="4"
          autosize
          type="textarea"
          maxlength="500"
          show-word-limit
          :rules="[{ required: true, message: '请填写需求描述' }]"
        />
      </van-cell-group>
      
      <van-cell-group inset class="mt-12">
        <LocationPicker
          v-model="form.location"
          label="位置"
          placeholder="请选择位置"
        />
      </van-cell-group>
      
      <van-cell-group inset class="mt-12">
        <van-field
          v-model="form.rewardAmount"
          name="rewardAmount"
          label="悬赏积分"
          placeholder="请输入悬赏积分"
          type="digit"
          :rules="[
            { required: true, message: '请输入悬赏积分' },
            { validator: validateReward, message: '积分不足' }
          ]"
        >
          <template #right-icon>
            <span class="points-hint">
              可用: {{ authStore.availablePoints }}
            </span>
          </template>
        </van-field>
        
        <van-field
          v-model="form.compensateRate"
          name="compensateRate"
          label="补偿比例"
          placeholder="0-10"
          type="digit"
          :rules="[
            { validator: validateRate, message: '请输入0-10之间的数字' }
          ]"
        >
          <template #right-icon>
            <span>%</span>
          </template>
          <template #extra>
            <span class="rate-hint">未被选中接单者获得的补偿比例</span>
          </template>
        </van-field>
        
        <van-field
          v-model="deadlineText"
          name="deadline"
          label="截止时间"
          placeholder="请选择截止时间"
          readonly
          is-link
          @click="showDeadlinePicker = true"
          :rules="[{ required: true, message: '请选择截止时间' }]"
        />
      </van-cell-group>
      
      <!-- 商家专属选项 -->
      <van-cell-group v-if="isMerchant" inset class="mt-12">
        <van-cell title="帖子类型" value="商家帖子" />
        <van-field
          v-model="selectionModeText"
          label="选中方式"
          placeholder="请选择"
          readonly
          is-link
          @click="showSelectionModePicker = true"
        />
        <van-field
          v-model="form.selectionCount"
          label="选中数量"
          placeholder="1"
          type="digit"
        />
        <van-field
          v-model="rewardTypeText"
          label="奖励类型"
          placeholder="请选择"
          readonly
          is-link
          @click="showRewardTypePicker = true"
        />
      </van-cell-group>
      
      <div class="submit-btn">
        <van-button round block type="primary" native-type="submit" :loading="submitting">
          发布需求
        </van-button>
      </div>
    </van-form>
    
    <!-- 截止时间选择器 -->
    <van-popup v-model:show="showDeadlinePicker" position="bottom" round>
      <van-picker
        :columns="deadlineColumns"
        @confirm="onDeadlineConfirm"
        @cancel="showDeadlinePicker = false"
        show-toolbar
        title="选择截止时间"
      />
    </van-popup>
    
    <!-- 商家：选中方式选择器 -->
    <van-popup v-model:show="showSelectionModePicker" position="bottom" round>
      <van-picker
        :columns="selectionModeColumns"
        @confirm="onSelectionModeConfirm"
        @cancel="showSelectionModePicker = false"
        show-toolbar
        title="选择选中方式"
      />
    </van-popup>
    
    <!-- 商家：奖励类型选择器 -->
    <van-popup v-model:show="showRewardTypePicker" position="bottom" round>
      <van-picker
        :columns="rewardTypeColumns"
        @confirm="onRewardTypeConfirm"
        @cancel="showRewardTypePicker = false"
        show-toolbar
        title="选择奖励类型"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { showSuccessToast, showFailToast } from 'vant'
import { useAuthStore } from '@/stores/auth'
import { createPost } from '@/api/post'
import LocationPicker from '@/components/LocationPicker.vue'

const authStore = useAuthStore()
const isMerchant = computed(() => authStore.userInfo?.role === 'merchant')

const form = ref({
  title: '',
  description: '',
  location: null,
  rewardAmount: '',
  compensateRate: '0',
  deadline: null,
  selectionMode: '',
  selectionCount: 1,
  rewardType: 'points',
})

const submitting = ref(false)
const showDeadlinePicker = ref(false)
const deadlineText = ref('')

// 商家专属字段
const showSelectionModePicker = ref(false)
const showRewardTypePicker = ref(false)
const selectionModeText = ref('手动')
const rewardTypeText = ref('积分')

const selectionModeColumns = [
  { text: '手动', value: 'manual' },
  { text: '随机', value: 'random' },
  { text: '前N名', value: 'first_n' },
]

const rewardTypeColumns = [
  { text: '积分', value: 'points' },
  { text: '代金券', value: 'voucher' },
]

// 截止时间选项
const deadlineColumns = [
  { text: '1小时后', value: 1 },
  { text: '2小时后', value: 2 },
  { text: '4小时后', value: 4 },
  { text: '8小时后', value: 8 },
  { text: '12小时后', value: 12 },
  { text: '24小时后', value: 24 },
  { text: '48小时后', value: 48 },
  { text: '3天后', value: 72 },
  { text: '7天后', value: 168 }
]

// 验证悬赏积分
const validateReward = (val) => {
  const points = parseInt(val)
  return points > 0 && points <= authStore.availablePoints
}

// 验证补偿比例
const validateRate = (val) => {
  const rate = parseInt(val) || 0
  return rate >= 0 && rate <= 10
}

// 选择截止时间
const onDeadlineConfirm = ({ selectedOptions }) => {
  const hours = selectedOptions[0].value
  const deadline = new Date()
  deadline.setHours(deadline.getHours() + hours)
  
  form.value.deadline = deadline.toISOString()
  deadlineText.value = selectedOptions[0].text
  showDeadlinePicker.value = false
}

// 商家：选择选中方式
const onSelectionModeConfirm = ({ selectedOptions }) => {
  form.value.selectionMode = selectedOptions[0].value
  selectionModeText.value = selectedOptions[0].text
  showSelectionModePicker.value = false
}

// 商家：选择奖励类型
const onRewardTypeConfirm = ({ selectedOptions }) => {
  form.value.rewardType = selectedOptions[0].value
  rewardTypeText.value = selectedOptions[0].text
  showRewardTypePicker.value = false
}

// 提交表单
const onSubmit = async () => {
  submitting.value = true
  
  try {
    console.log('[POST-CREATE] 开始提交帖子...')
    const data = {
      title: form.value.title || '帮我看看',
      description: form.value.description,
      locationName: form.value.location?.name,
      address: form.value.location?.address,
      latitude: form.value.location?.latitude,
      longitude: form.value.location?.longitude,
      rewardAmount: parseInt(form.value.rewardAmount),
      compensateRate: parseInt(form.value.compensateRate) || 0,
      deadline: form.value.deadline
    }
    
    // 商家帖子附加字段
    if (isMerchant.value) {
      data.postType = 'merchant'
      data.selectionMode = form.value.selectionMode || 'manual'
      data.selectionCount = parseInt(form.value.selectionCount) || 1
      data.rewardType = form.value.rewardType || 'points'
    }
    
    const result = await createPost(data)
    console.log('[POST-CREATE] API返回成功:', result)
    submitting.value = false
    showSuccessToast('发布成功')
    console.log('[POST-CREATE] 准备跳转到首页...')
    // 直接跳转，不使用 setTimeout，不使用 Vue Router
    window.location.replace('/')
  } catch (error) {
    console.error('[POST-CREATE] 提交失败:', error)
    submitting.value = false
    showFailToast(error.message || '发布失败')
  }
}

const onClickLeft = () => {
  window.history.back()
}
</script>

<style scoped>
.post-create-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.post-form {
  padding: 16px 0;
}

.mt-12 {
  margin-top: 12px;
}

.points-hint {
  font-size: 12px;
  color: #999;
}

.rate-hint {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.submit-btn {
  padding: 24px 16px;
}
</style>