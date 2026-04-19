<template>
  <div class="posts-page">
    <!-- 发布帖子 -->
    <el-card shadow="hover" style="margin-bottom: 20px;">
      <template #header><span>发布帖子</span></template>
      <el-form :model="createForm" :rules="createRules" ref="createFormRef" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="标题" prop="title">
              <el-input v-model="createForm.title" placeholder="请输入标题（选填）" maxlength="50" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="悬赏积分" prop="rewardAmount">
              <el-input-number v-model="createForm.rewardAmount" :min="createForm.rewardType === 'voucher' ? 0 : 1" />
              <span v-if="createForm.rewardType === 'voucher'" style="margin-left:8px;color:#909399;font-size:12px;">代金券奖励时积分可为0</span>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="需求描述" prop="description">
          <el-input v-model="createForm.description" type="textarea" :rows="3" placeholder="请详细描述需求..." maxlength="500" show-word-limit />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="截止时间" prop="deadline">
              <el-date-picker
                v-model="createForm.deadline"
                type="datetime"
                placeholder="选择截止时间"
                style="width: 100%"
                :disabled-date="disabledDate"
                format="YYYY-MM-DD HH:mm"
                value-format="YYYY-MM-DDTHH:mm:ss"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="选中方式">
              <el-select v-model="createForm.selectionMode" placeholder="请选择">
                <el-option label="手动" value="manual" />
                <el-option label="随机" value="random" />
                <el-option label="前N名" value="first_n" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="4">
            <el-form-item label="选中数量">
              <el-input-number v-model="createForm.selectionCount" :min="1" />
            </el-form-item>
          </el-col>
          <el-col :span="4">
            <el-form-item label="奖励类型">
              <el-select v-model="createForm.rewardType" @change="onRewardTypeChange">
                <el-option label="积分" value="points" />
                <el-option label="代金券" value="voucher" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <!-- 代金券批次选择（奖励类型为代金券时显示） -->
        <el-row v-if="createForm.rewardType === 'voucher'" :gutter="20">
          <el-col :span="12">
            <el-form-item label="代金券批次" prop="voucherBatchId">
              <el-select v-model="createForm.voucherBatchId" placeholder="请选择代金券批次" style="width: 100%">
                <el-option
                  v-for="batch in voucherBatches"
                  :key="batch.id"
                  :label="`${batch.name}（${batch.faceValue}元 × ${batch.remainingQty}张）`"
                  :value="batch.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item>
          <el-button type="primary" @click="onCreatePost" :loading="creating">发布帖子</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 帖子列表 -->
    <el-card shadow="hover">
      <template #header><span>我的帖子</span></template>
      <el-table :data="posts" stripe v-loading="loading">
        <el-table-column prop="title" label="标题" min-width="140" />
        <el-table-column prop="rewardAmount" label="悬赏" width="80" />
        <el-table-column label="选中方式" width="90">
          <template #default="{ row }">
            {{ selectionModeText(row.selectionMode) }}
          </template>
        </el-table-column>
        <el-table-column prop="selectionCount" label="选中数" width="80" />
        <el-table-column label="奖励" width="80">
          <template #default="{ row }">
            {{ row.rewardType === 'voucher' ? '代金券' : '积分' }}
          </template>
        </el-table-column>
        <el-table-column prop="orderCount" label="接单数" width="80" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="postStatusType(row.status)">{{ postStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="deadline" label="截止时间" width="170" />
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="viewPostDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-if="total > pageSize"
        :current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="onPageChange"
        style="margin-top: 16px; justify-content: flex-end;"
      />
    </el-card>

    <!-- 帖子详情弹窗 -->
    <el-dialog v-model="showDetailDialog" :title="`帖子详情 - ${currentPost?.title || ''}`" width="700px">
      <el-descriptions :column="2" border size="small" v-if="currentPost">
        <el-descriptions-item label="标题">{{ currentPost.title }}</el-descriptions-item>
        <el-descriptions-item label="悬赏积分">{{ currentPost.rewardAmount }}</el-descriptions-item>
        <el-descriptions-item label="选中方式">{{ selectionModeText(currentPost.selectionMode) }}</el-descriptions-item>
        <el-descriptions-item label="选中数量">{{ currentPost.selectionCount }}</el-descriptions-item>
        <el-descriptions-item label="奖励类型">{{ currentPost.rewardType === 'voucher' ? '代金券' : '积分' }}</el-descriptions-item>
        <el-descriptions-item label="接单数">{{ currentPost.orderCount }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ postStatusText(currentPost.status) }}</el-descriptions-item>
        <el-descriptions-item label="截止时间">{{ currentPost.deadline }}</el-descriptions-item>
        <el-descriptions-item label="描述" :span="2">{{ currentPost.description }}</el-descriptions-item>
      </el-descriptions>
      <h4 style="margin: 16px 0 8px;">接单列表</h4>
      <el-table :data="postOrders" stripe size="small">
        <el-table-column label="接单人" width="120">
          <template #default="{ row }">{{ row.user?.nickname || '-' }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="orderStatusType(row.status)" size="small">{{ orderStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="接单时间" min-width="170" />
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getMerchantPosts, getMerchantPostDetail, createMerchantPost, getVoucherBatches } from '../api/merchant'

const loading = ref(false)
const posts = ref([])
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)

const creating = ref(false)
const createFormRef = ref(null)
const createForm = reactive({
  title: '',
  description: '',
  rewardAmount: 10,
  compensateRate: 0,
  deadline: null,
  selectionMode: 'manual',
  selectionCount: 1,
  rewardType: 'points',
  voucherBatchId: null
})

const voucherBatches = ref([])

// 禁用今天之前的日期
function disabledDate(time) {
  return time.getTime() < Date.now() - 86400000
}

const createRules = {
  description: [{ required: true, message: '请输入需求描述', trigger: 'blur' }],
  rewardAmount: [{ required: true, message: '请输入悬赏积分', trigger: 'blur' }],
  deadline: [{ required: true, message: '请选择截止时间', trigger: 'change' }],
  voucherBatchId: [{
    validator: (rule, value, callback) => {
      if (createForm.rewardType === 'voucher' && !value) {
        callback(new Error('请选择代金券批次'))
      } else {
        callback()
      }
    },
    trigger: 'change'
  }]
}

// 加载代金券批次
async function loadVoucherBatches() {
  try {
    const res = await getVoucherBatches({ pageSize: 100 })
    voucherBatches.value = (res.data?.list || res.data || []).filter(b => b.remainingQty > 0)
  } catch (e) {
    console.error('加载代金券批次失败', e)
  }
}

// 奖励类型变化时重置代金券批次和积分
function onRewardTypeChange() {
  if (createForm.rewardType === 'voucher') {
    createForm.voucherBatchId = null
    createForm.rewardAmount = 0
    loadVoucherBatches()
  } else {
    createForm.voucherBatchId = null
    if (createForm.rewardAmount < 1) createForm.rewardAmount = 1
  }
}

// 帖子详情
const showDetailDialog = ref(false)
const currentPost = ref(null)
const postOrders = ref([])

function selectionModeText(mode) {
  const map = { manual: '手动', random: '随机', first_n: '前N名' }
  return map[mode] || mode || '手动'
}

function postStatusType(status) {
  const map = { active: 'success', completed: 'info', expired: 'warning', cancelled: 'danger' }
  return map[status] || 'info'
}

function postStatusText(status) {
  const map = { active: '进行中', completed: '已完成', expired: '已过期', cancelled: '已取消' }
  return map[status] || status
}

function orderStatusType(status) {
  const map = { accepted: '', submitted: 'warning', selected: 'success', rejected: 'danger', expired: 'info' }
  return map[status] || ''
}

function orderStatusText(status) {
  const map = { accepted: '已接单', submitted: '已提交', selected: '已选中', rejected: '未选中', expired: '已过期' }
  return map[status] || status
}

async function loadPosts() {
  loading.value = true
  try {
    const res = await getMerchantPosts({ page: page.value, pageSize: pageSize.value })
    posts.value = res.data?.list || res.data || []
    total.value = res.data?.total || 0
  } catch (e) {
    ElMessage.error('加载帖子失败')
  } finally {
    loading.value = false
  }
}

async function onCreatePost() {
  try {
    await createFormRef.value.validate()
  } catch { return }

  creating.value = true
  try {
    const data = {
      ...createForm,
      title: createForm.title || '帮我看看',
      postType: 'merchant',
      deadline: typeof createForm.deadline === 'string'
        ? createForm.deadline
        : createForm.deadline?.toISOString()
    }
    // 代金券类型时清理 voucherBatchId
    if (createForm.rewardType !== 'voucher') {
      delete data.voucherBatchId
    }
    await createMerchantPost(data)
    ElMessage.success('发布成功')
    createForm.title = ''
    createForm.description = ''
    createForm.deadline = null
    createForm.voucherBatchId = null
    loadPosts()
  } catch (e) {
    ElMessage.error(e.message || '发布失败')
  } finally {
    creating.value = false
  }
}

async function viewPostDetail(post) {
  try {
    const res = await getMerchantPostDetail(post.id)
    currentPost.value = res.data?.post || post
    postOrders.value = res.data?.orders || []
    showDetailDialog.value = true
  } catch (e) {
    ElMessage.error('加载详情失败')
  }
}

function onPageChange(p) {
  page.value = p
  loadPosts()
}

onMounted(() => loadPosts())
</script>

<style scoped>
</style>
