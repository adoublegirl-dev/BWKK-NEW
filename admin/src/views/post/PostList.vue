<template>
  <div>
    <!-- 筛选栏 -->
    <el-card shadow="hover" class="search-card">
      <el-form :inline="true" :model="query">
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" clearable style="width: 120px">
            <el-option label="进行中" value="active" />
            <el-option label="已完成" value="completed" />
            <el-option label="已过期" value="expired" />
            <el-option label="已取消" value="cancelled" />
          </el-select>
        </el-form-item>
        <el-form-item label="城市">
          <el-input v-model="query.city" placeholder="城市" clearable style="width: 120px" />
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="query.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 240px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 表格 -->
    <el-card shadow="hover" style="margin-top: 16px">
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="120">
          <template #default="{ row }">{{ row.id.slice(0, 10) }}...</template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="180" show-overflow-tooltip />
        <el-table-column label="发单人" width="140">
          <template #default="{ row }">{{ row.user?.nickname || '未知' }}</template>
        </el-table-column>
        <el-table-column prop="rewardAmount" label="悬赏" width="80" align="center">
          <template #default="{ row }">{{ row.rewardAmount }}分</template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="接单数" width="80" align="center">
          <template #default="{ row }">{{ row._count.orders }}</template>
        </el-table-column>
        <el-table-column prop="deadline" label="截止时间" width="160">
          <template #default="{ row }">{{ formatDate(row.deadline) }}</template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="160">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="$router.push(`/posts/${row.id}`)">详情</el-button>
            <el-dropdown trigger="click" style="margin-left: 8px">
              <el-button type="warning" link>状态 <el-icon><ArrowDown /></el-icon></el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="changeStatus(row.id, 'completed')">强制完成</el-dropdown-item>
                  <el-dropdown-item @click="changeStatus(row.id, 'expired')">强制过期</el-dropdown-item>
                  <el-dropdown-item @click="changeStatus(row.id, 'cancelled')">强制取消</el-dropdown-item>
                  <el-dropdown-item @click="handleDelete(row.id)" divided>
                    <span style="color: #f56c6c">删除帖子</span>
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="query.page"
        v-model:page-size="query.pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        style="margin-top: 16px; justify-content: flex-end"
        @size-change="fetchList"
        @current-change="fetchList"
      />
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { getPosts, updatePostStatus, deletePost } from '../../api/admin'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'

const list = ref([])
const total = ref(0)
const loading = ref(false)

const query = reactive({
  page: 1,
  pageSize: 20,
  status: '',
  city: '',
  dateRange: null,
})

const statusMap = {
  active: { label: '进行中', type: 'success' },
  completed: { label: '已完成', type: 'info' },
  expired: { label: '已过期', type: 'warning' },
  cancelled: { label: '已取消', type: 'danger' },
}

function statusLabel(s) { return statusMap[s]?.label || s }
function statusType(s) { return statusMap[s]?.type || 'info' }
function formatDate(d) { return dayjs(d).format('YYYY-MM-DD HH:mm') }

async function fetchList() {
  loading.value = true
  try {
    const params = {
      page: query.page,
      pageSize: query.pageSize,
      status: query.status,
      city: query.city,
      startTime: query.dateRange?.[0] || '',
      endTime: query.dateRange?.[1] || '',
    }
    const res = await getPosts(params)
    list.value = res.data
    total.value = res.pagination.total
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  query.page = 1
  fetchList()
}

function resetQuery() {
  query.status = ''
  query.city = ''
  query.dateRange = null
  query.page = 1
  fetchList()
}

async function changeStatus(id, status) {
  await ElMessageBox.confirm(`确认将帖子状态修改为「${statusLabel(status)}」?`, '确认操作', { type: 'warning' })
  await updatePostStatus(id, { status })
  ElMessage.success('状态已更新')
  fetchList()
}

async function handleDelete(id) {
  await ElMessageBox.confirm('确认删除该帖子？此操作不可恢复！', '删除确认', { type: 'error' })
  await deletePost(id)
  ElMessage.success('帖子已删除')
  fetchList()
}

onMounted(fetchList)
</script>
