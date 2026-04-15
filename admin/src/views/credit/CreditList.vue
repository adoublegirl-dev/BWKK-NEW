<template>
  <div>
    <el-card shadow="hover" class="search-card">
      <el-form :inline="true" :model="query">
        <el-form-item label="用户ID">
          <el-input v-model="query.userId" placeholder="用户ID" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="query.type" placeholder="全部" clearable style="width: 120px">
            <el-option label="发单信用" value="poster" />
            <el-option label="接单信用" value="doer" />
          </el-select>
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
        <el-table-column label="用户" width="140">
          <template #default="{ row }">
            <div>{{ row.user?.nickname || '未知' }}</div>
            <div style="font-size: 12px; color: #999">{{ row.user?.email || '' }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.type === 'poster' ? 'primary' : 'success'" size="small">
              {{ row.type === 'poster' ? '发单' : '接单' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="change" label="变动" width="80" align="center">
          <template #default="{ row }">
            <span :style="{ color: row.change > 0 ? '#67c23a' : '#f56c6c' }">
              {{ row.change > 0 ? '+' : '' }}{{ row.change }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="beforeScore" label="变动前" width="80" align="center" />
        <el-table-column prop="afterScore" label="变动后" width="80" align="center" />
        <el-table-column prop="reason" label="原因" min-width="200" show-overflow-tooltip />
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
import { getCreditRecords } from '../../api/admin'
import dayjs from 'dayjs'

const list = ref([])
const total = ref(0)
const loading = ref(false)
const query = reactive({ page: 1, pageSize: 20, userId: '', type: '' })

function formatDate(d) { return dayjs(d).format('YYYY-MM-DD HH:mm') }

async function fetchList() {
  loading.value = true
  try {
    const res = await getCreditRecords({ page: query.page, pageSize: query.pageSize, userId: query.userId, type: query.type })
    list.value = res.data; total.value = res.pagination.total
  } finally { loading.value = false }
}

function handleSearch() { query.page = 1; fetchList() }
function resetQuery() { query.userId = ''; query.type = ''; query.page = 1; fetchList() }

onMounted(fetchList)
</script>
