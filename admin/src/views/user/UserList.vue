<template>
  <div>
    <!-- 搜索栏 -->
    <el-card shadow="hover" class="search-card">
      <el-form :inline="true" :model="query">
        <el-form-item label="搜索">
          <el-input v-model="query.keyword" placeholder="邮箱/昵称/ID" clearable style="width: 200px" @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item label="信用状态">
          <el-select v-model="query.creditStatus" placeholder="全部" clearable style="width: 130px">
            <el-option label="正常" value="normal" />
            <el-option label="冻结" value="frozen" />
            <el-option label="冷却" value="cooldown" />
          </el-select>
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
        <el-table-column label="用户" min-width="180">
          <template #default="{ row }">
            <div style="display: flex; align-items: center; gap: 8px">
              <el-avatar :size="32" :src="row.avatarUrl">{{ (row.nickname || '?')[0] }}</el-avatar>
              <div>
                <div>{{ row.nickname || '未设置' }}</div>
                <div style="font-size: 12px; color: #999">{{ row.id.slice(0, 10) }}...</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="email" label="邮箱" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <span>{{ row.email || '-' }}</span>
            <el-tag v-if="row.emailVerified" type="success" size="small" style="margin-left: 4px">已验证</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="city" label="城市" width="90" />
        <el-table-column label="积分" width="100" align="center">
          <template #default="{ row }">
            <span>{{ row.totalPoints - row.frozenPoints }} / {{ row.totalPoints }}</span>
          </template>
        </el-table-column>
        <el-table-column label="发单信用" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="creditType(row.posterCredit)" size="small">{{ row.posterCredit }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="接单信用" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="creditType(row.doerCredit)" size="small">{{ row.doerCredit }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="creditStatus" label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.creditStatus === 'normal' ? 'success' : 'danger'" size="small">
              {{ row.creditStatus === 'normal' ? '正常' : row.creditStatus === 'frozen' ? '冻结' : '冷却' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="注册时间" width="160">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="$router.push(`/users/${row.id}`)">详情</el-button>
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
import { getUsers } from '../../api/admin'
import dayjs from 'dayjs'

const list = ref([])
const total = ref(0)
const loading = ref(false)

const query = reactive({
  page: 1,
  pageSize: 20,
  keyword: '',
  creditStatus: '',
})

function creditType(score) {
  if (score >= 90) return 'success'
  if (score >= 60) return 'warning'
  return 'danger'
}

function formatDate(date) {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

async function fetchList() {
  loading.value = true
  try {
    const res = await getUsers(query)
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
  query.keyword = ''
  query.creditStatus = ''
  query.page = 1
  fetchList()
}

onMounted(fetchList)
</script>
