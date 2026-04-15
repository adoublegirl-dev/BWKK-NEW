<template>
  <div>
    <el-card shadow="hover" class="search-card">
      <el-form :inline="true" :model="query">
        <el-form-item label="操作类型">
          <el-select v-model="query.action" placeholder="全部" clearable style="width: 150px">
            <el-option v-for="a in actions" :key="a.value" :label="a.label" :value="a.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker v-model="query.dateRange" type="daterange" range-separator="至" start-placeholder="开始" end-placeholder="结束" value-format="YYYY-MM-DD" style="width: 240px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="hover" style="margin-top: 16px">
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="120">
          <template #default="{ row }">{{ row.id.slice(0, 10) }}...</template>
        </el-table-column>
        <el-table-column label="管理员" width="100">
          <template #default="{ row }">{{ row.admin?.username || '未知' }}</template>
        </el-table-column>
        <el-table-column prop="action" label="操作类型" width="120">
          <template #default="{ row }">
            <el-tag size="small">{{ actionLabel(row.action) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="目标" width="180">
          <template #default="{ row }">
            <span v-if="row.targetType">{{ row.targetType }} / {{ row.targetId?.slice(0, 10) }}...</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="detail" label="详情" min-width="250" show-overflow-tooltip>
          <template #default="{ row }">{{ formatDetail(row.detail) }}</template>
        </el-table-column>
        <el-table-column prop="createdAt" label="时间" width="160">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
      </el-table>

      <el-pagination v-model:current-page="query.page" v-model:page-size="query.pageSize" :total="total" :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next" style="margin-top: 16px; justify-content: flex-end" @size-change="fetchList" @current-change="fetchList" />
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { getLogs } from '../../api/admin'
import dayjs from 'dayjs'

const list = ref([])
const total = ref(0)
const loading = ref(false)
const query = reactive({ page: 1, pageSize: 20, action: '', dateRange: null })

const actions = [
  { value: 'login', label: '登录' },
  { value: 'edit_user', label: '编辑用户' },
  { value: 'reset_password', label: '重置密码' },
  { value: 'adjust_points', label: '调整积分' },
  { value: 'adjust_credit', label: '调整信用' },
  { value: 'edit_post', label: '编辑帖子' },
  { value: 'delete_post', label: '删除帖子' },
]

const actionLabelMap = Object.fromEntries(actions.map(a => [a.value, a.label]))

function actionLabel(a) { return actionLabelMap[a] || a }
function formatDate(d) { return dayjs(d).format('YYYY-MM-DD HH:mm') }

function formatDetail(detail) {
  if (!detail) return '-'
  try { return JSON.stringify(JSON.parse(detail), null, 2) } catch { return detail }
}

async function fetchList() {
  loading.value = true
  try {
    const res = await getLogs({
      page: query.page, pageSize: query.pageSize, action: query.action,
      startTime: query.dateRange?.[0] || '', endTime: query.dateRange?.[1] || '',
    })
    list.value = res.data; total.value = res.pagination.total
  } finally { loading.value = false }
}

function handleSearch() { query.page = 1; fetchList() }
function resetQuery() { query.action = ''; query.dateRange = null; query.page = 1; fetchList() }

onMounted(fetchList)
</script>
