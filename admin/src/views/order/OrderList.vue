<template>
  <div>
    <el-card shadow="hover" class="search-card">
      <el-form :inline="true" :model="query">
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" clearable style="width: 120px">
            <el-option label="已接单" value="accepted" />
            <el-option label="已提交" value="submitted" />
            <el-option label="已选中" value="selected" />
            <el-option label="已拒绝" value="rejected" />
            <el-option label="已过期" value="expired" />
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
        <el-table-column label="帖子" min-width="150">
          <template #default="{ row }">{{ row.post?.title || '-' }}</template>
        </el-table-column>
        <el-table-column label="接单人" width="120">
          <template #default="{ row }">{{ row.user?.nickname || '未知' }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="submittedAt" label="提交时间" width="160">
          <template #default="{ row }">{{ row.submittedAt ? formatDate(row.submittedAt) : '-' }}</template>
        </el-table-column>
        <el-table-column prop="createdAt" label="接单时间" width="160">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="$router.push(`/orders/${row.id}`)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination v-model:current-page="query.page" v-model:page-size="query.pageSize" :total="total" :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next" style="margin-top: 16px; justify-content: flex-end" @size-change="fetchList" @current-change="fetchList" />
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { getOrders } from '../../api/admin'
import dayjs from 'dayjs'

const list = ref([])
const total = ref(0)
const loading = ref(false)

const query = reactive({ page: 1, pageSize: 20, status: '', dateRange: null })

const orderStatusMap = {
  accepted: { label: '已接单', type: 'primary' },
  submitted: { label: '已提交', type: 'success' },
  selected: { label: '已选中', type: 'success' },
  rejected: { label: '已拒绝', type: 'danger' },
  expired: { label: '已过期', type: 'warning' },
}

function statusLabel(s) { return orderStatusMap[s]?.label || s }
function statusType(s) { return orderStatusMap[s]?.type || 'info' }
function formatDate(d) { return dayjs(d).format('YYYY-MM-DD HH:mm') }

async function fetchList() {
  loading.value = true
  try {
    const res = await getOrders({
      page: query.page, pageSize: query.pageSize, status: query.status,
      startTime: query.dateRange?.[0] || '', endTime: query.dateRange?.[1] || '',
    })
    list.value = res.data
    total.value = res.pagination.total
  } finally { loading.value = false }
}

function handleSearch() { query.page = 1; fetchList() }
function resetQuery() { query.status = ''; query.dateRange = null; query.page = 1; fetchList() }

onMounted(fetchList)
</script>
