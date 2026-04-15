<template>
  <div v-loading="loading">
    <el-page-header @back="$router.push('/users')" style="margin-bottom: 20px">
      <template #content>
        <span>用户详情</span>
      </template>
    </el-page-header>

    <el-row :gutter="20" v-if="user">
      <!-- 基本信息卡片 -->
      <el-col :span="14">
        <el-card shadow="hover">
          <template #header>
            <div style="display: flex; justify-content: space-between; align-items: center">
              <span>基本信息</span>
              <el-button type="primary" size="small" @click="showEditDialog = true">编辑</el-button>
            </div>
          </template>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="ID">{{ user.id }}</el-descriptions-item>
            <el-descriptions-item label="昵称">{{ user.nickname || '未设置' }}</el-descriptions-item>
            <el-descriptions-item label="邮箱">
              {{ user.email || '-' }}
              <el-tag v-if="user.emailVerified" type="success" size="small" style="margin-left: 4px">已验证</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="城市">{{ user.city || '未设置' }}</el-descriptions-item>
            <el-descriptions-item label="微信OpenID">{{ user.openid ? user.openid.slice(0, 16) + '...' : '-' }}</el-descriptions-item>
            <el-descriptions-item label="信用状态">
              <el-tag :type="user.creditStatus === 'normal' ? 'success' : 'danger'">
                {{ { normal: '正常', frozen: '冻结', cooldown: '冷却' }[user.creditStatus] }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="注册时间">{{ formatDate(user.createdAt) }}</el-descriptions-item>
            <el-descriptions-item label="更新时间">{{ formatDate(user.updatedAt) }}</el-descriptions-item>
          </el-descriptions>
        </el-card>

        <!-- 统计信息 -->
        <el-card shadow="hover" style="margin-top: 16px">
          <template #header>统计数据</template>
          <el-descriptions :column="3" border>
            <el-descriptions-item label="总积分">{{ user.totalPoints }}</el-descriptions-item>
            <el-descriptions-item label="冻结积分">{{ user.frozenPoints }}</el-descriptions-item>
            <el-descriptions-item label="可用积分">{{ user.totalPoints - user.frozenPoints }}</el-descriptions-item>
            <el-descriptions-item label="发单信用分">{{ user.posterCredit }}</el-descriptions-item>
            <el-descriptions-item label="接单信用分">{{ user.doerCredit }}</el-descriptions-item>
            <el-descriptions-item label="信用状态">{{ user.creditStatus }}</el-descriptions-item>
            <el-descriptions-item label="发帖数">{{ user._count.posts }}</el-descriptions-item>
            <el-descriptions-item label="接单数">{{ user._count.orders }}</el-descriptions-item>
            <el-descriptions-item label="交易数">{{ user._count.transactions }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>

      <!-- 操作面板 -->
      <el-col :span="10">
        <!-- 积分调整 -->
        <el-card shadow="hover">
          <template #header>积分调整</template>
          <el-form label-width="80px" size="small">
            <el-form-item label="调整数量">
              <el-input-number v-model="pointsForm.amount" :min="-9999" :max="9999" />
            </el-form-item>
            <el-form-item label="原因">
              <el-input v-model="pointsForm.reason" placeholder="调整原因" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleAdjustPoints" :loading="pointsLoading">确认调整</el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <!-- 信用分调整 -->
        <el-card shadow="hover" style="margin-top: 16px">
          <template #header>信用分调整</template>
          <el-form label-width="80px" size="small">
            <el-form-item label="信用类型">
              <el-select v-model="creditForm.type" style="width: 100%">
                <el-option label="发单信用" value="poster" />
                <el-option label="接单信用" value="doer" />
              </el-select>
            </el-form-item>
            <el-form-item label="变动值">
              <el-input-number v-model="creditForm.change" :min="-100" :max="100" />
            </el-form-item>
            <el-form-item label="原因">
              <el-input v-model="creditForm.reason" placeholder="调整原因" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleAdjustCredit" :loading="creditLoading">确认调整</el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <!-- 重置密码 -->
        <el-card shadow="hover" style="margin-top: 16px">
          <template #header>重置密码</template>
          <el-form label-width="80px" size="small">
            <el-form-item label="新密码">
              <el-input v-model="newPassword" type="password" placeholder="至少6位" show-password />
            </el-form-item>
            <el-form-item>
              <el-button type="warning" @click="handleResetPassword" :loading="passwordLoading">重置密码</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
    </el-row>

    <!-- 编辑弹窗 -->
    <el-dialog v-model="showEditDialog" title="编辑用户信息" width="500px">
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="昵称">
          <el-input v-model="editForm.nickname" />
        </el-form-item>
        <el-form-item label="城市">
          <el-input v-model="editForm.city" />
        </el-form-item>
        <el-form-item label="信用状态">
          <el-select v-model="editForm.creditStatus" style="width: 100%">
            <el-option label="正常" value="normal" />
            <el-option label="冻结" value="frozen" />
            <el-option label="冷却" value="cooldown" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditDialog = false">取消</el-button>
        <el-button type="primary" @click="handleUpdateUser" :loading="editLoading">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getUserDetail, updateUser, resetUserPassword, adjustUserPoints, adjustUserCredit } from '../../api/admin'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'

const route = useRoute()
const loading = ref(false)
const user = ref(null)
const showEditDialog = ref(false)
const editLoading = ref(false)
const pointsLoading = ref(false)
const creditLoading = ref(false)
const passwordLoading = ref(false)

const editForm = reactive({ nickname: '', city: '', creditStatus: '' })
const pointsForm = reactive({ amount: 0, reason: '' })
const creditForm = reactive({ type: 'poster', change: 0, reason: '' })
const newPassword = ref('')

function formatDate(date) {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss')
}

async function fetchDetail() {
  loading.value = true
  try {
    const res = await getUserDetail(route.params.id)
    user.value = res.data
    editForm.nickname = res.data.nickname || ''
    editForm.city = res.data.city || ''
    editForm.creditStatus = res.data.creditStatus
  } finally {
    loading.value = false
  }
}

async function handleUpdateUser() {
  editLoading.value = true
  try {
    await updateUser(route.params.id, editForm)
    ElMessage.success('更新成功')
    showEditDialog.value = false
    fetchDetail()
  } finally {
    editLoading.value = false
  }
}

async function handleResetPassword() {
  if (!newPassword.value || newPassword.value.length < 6) {
    ElMessage.warning('密码不能少于6位')
    return
  }
  passwordLoading.value = true
  try {
    await resetUserPassword(route.params.id, { newPassword: newPassword.value })
    ElMessage.success('密码已重置')
    newPassword.value = ''
  } finally {
    passwordLoading.value = false
  }
}

async function handleAdjustPoints() {
  if (!pointsForm.reason) {
    ElMessage.warning('请输入调整原因')
    return
  }
  pointsLoading.value = true
  try {
    await adjustUserPoints(route.params.id, pointsForm)
    ElMessage.success('积分调整成功')
    pointsForm.amount = 0
    pointsForm.reason = ''
    fetchDetail()
  } finally {
    pointsLoading.value = false
  }
}

async function handleAdjustCredit() {
  if (!creditForm.reason) {
    ElMessage.warning('请输入调整原因')
    return
  }
  creditLoading.value = true
  try {
    await adjustUserCredit(route.params.id, creditForm)
    ElMessage.success('信用分调整成功')
    creditForm.change = 0
    creditForm.reason = ''
    fetchDetail()
  } finally {
    creditLoading.value = false
  }
}

onMounted(fetchDetail)
</script>
