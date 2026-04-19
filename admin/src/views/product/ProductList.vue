<template>
  <div class="product-list">
    <el-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>积分商品管理</span>
          <el-button type="primary" @click="showAddDialog">添加商品</el-button>
        </div>
      </template>

      <!-- 筛选栏 -->
      <div style="margin-bottom: 16px; display: flex; gap: 12px; flex-wrap: wrap;">
        <el-input v-model="searchKeyword" placeholder="搜索商品名称" style="width: 200px;" clearable @clear="loadProducts" @keyup.enter="loadProducts" />
        <el-select v-model="filterCategory" placeholder="选择分类" clearable style="width: 160px;" @change="loadProducts">
          <el-option v-for="cat in flatCategories" :key="cat.id" :label="cat.name" :value="cat.id" />
        </el-select>
        <el-select v-model="filterStatus" placeholder="商品状态" clearable style="width: 120px;" @change="loadProducts">
          <el-option label="草稿" value="draft" />
          <el-option label="上架" value="active" />
          <el-option label="售罄" value="soldout" />
          <el-option label="下架" value="disabled" />
        </el-select>
        <el-button type="primary" @click="loadProducts">查询</el-button>
      </div>

      <!-- 商品表格 -->
      <el-table :data="products" border stripe v-loading="loading">
        <el-table-column prop="name" label="商品名称" min-width="160" show-overflow-tooltip />
        <el-table-column label="分类" width="120">
          <template #default="{ row }">
            {{ row.category?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="pointsPrice" label="积分价格" width="100" align="center" />
        <el-table-column prop="stock" label="库存" width="80" align="center" />
        <el-table-column label="已兑/剩余" width="100" align="center">
          <template #default="{ row }">
            {{ row.exchangedCount }}/{{ row.remainingCount }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="可兑日期" width="180">
          <template #default="{ row }">
            <span v-if="row.validFrom">{{ formatDate(row.validFrom) }} ~ {{ formatDate(row.validUntil) }}</span>
            <span v-else>不限</span>
          </template>
        </el-table-column>
        <el-table-column label="地区" width="120" show-overflow-tooltip>
          <template #default="{ row }">
            {{ [row.province, row.city, row.district].filter(Boolean).join('/') || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" align="center" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="showEditDialog(row)">编辑</el-button>
            <el-button v-if="row.status === 'draft' || row.status === 'disabled'" size="small" type="success" @click="handleToggleStatus(row, 'active')">上架</el-button>
            <el-button v-if="row.status === 'active'" size="small" type="warning" @click="handleToggleStatus(row, 'disabled')">下架</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div style="margin-top: 16px; display: flex; justify-content: flex-end;">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @size-change="loadProducts"
          @current-change="loadProducts"
        />
      </div>
    </el-card>

    <!-- 添加/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑商品' : '添加商品'" width="700px" destroy-on-close>
      <el-form :model="form" label-width="100px">
        <el-form-item label="商品名称" required>
          <el-input v-model="form.name" placeholder="请输入商品名称" />
        </el-form-item>
        <el-form-item label="商品分类">
          <el-cascader
            v-model="form.categoryPath"
            :options="categoryTree"
            :props="{ value: 'id', label: 'name', children: 'children', checkStrictly: true, emitPath: false }"
            placeholder="选择分类（可选）"
            clearable
            style="width: 100%;"
          />
        </el-form-item>
        <el-form-item label="积分价格" required>
          <el-input-number v-model="form.pointsPrice" :min="1" :max="999999" />
        </el-form-item>
        <el-form-item label="库存数量" required>
          <el-input-number v-model="form.stock" :min="0" :max="999999" />
        </el-form-item>
        <el-form-item label="商品描述">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="商品描述" />
        </el-form-item>
        <el-form-item label="商品图片">
          <el-input v-model="form.imagesStr" type="textarea" :rows="2" placeholder="图片URL，多个用逗号分隔" />
        </el-form-item>
        <el-form-item label="可兑日期">
          <el-date-picker
            v-model="form.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 100%;"
          />
        </el-form-item>
        <el-form-item label="地区">
          <div style="display: flex; gap: 8px;">
            <el-input v-model="form.province" placeholder="省" style="width: 33%;" />
            <el-input v-model="form.city" placeholder="市" style="width: 33%;" />
            <el-input v-model="form.district" placeholder="区" style="width: 33%;" />
          </div>
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio value="draft">草稿</el-radio>
            <el-radio value="active">上架</el-radio>
            <el-radio value="disabled">下架</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getProducts, createProduct, updateProduct, updateProductStatus, deleteProduct, getCategories } from '@/api/admin'

const products = ref([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const searchKeyword = ref('')
const filterCategory = ref('')
const filterStatus = ref('')

// 分类相关
const flatCategories = ref([])
const categoryTree = ref([])

// 弹窗相关
const dialogVisible = ref(false)
const isEdit = ref(false)
const editingId = ref(null)
const submitting = ref(false)
const form = ref(getDefaultForm())

function getDefaultForm() {
  return {
    name: '',
    categoryPath: '',
    pointsPrice: 100,
    stock: 0,
    description: '',
    imagesStr: '',
    dateRange: null,
    province: '',
    city: '',
    district: '',
    status: 'draft',
  }
}

const statusMap = {
  draft: { label: '草稿', type: 'info' },
  active: { label: '上架', type: 'success' },
  soldout: { label: '售罄', type: 'warning' },
  disabled: { label: '下架', type: 'danger' },
}
function statusLabel(s) { return statusMap[s]?.label || s }
function statusTagType(s) { return statusMap[s]?.type || 'info' }

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('zh-CN')
}

async function loadCategories() {
  try {
    const res = await getCategories()
    const list = res.data || []
    flatCategories.value = list
    // 构建树形
    const map = {}
    const tree = []
    list.forEach(cat => { map[cat.id] = { id: cat.id, name: cat.name, children: [] } })
    list.forEach(cat => {
      if (cat.parentId && map[cat.parentId]) {
        map[cat.parentId].children.push(map[cat.id])
      } else {
        tree.push(map[cat.id])
      }
    })
    categoryTree.value = tree
  } catch (e) {
    console.error('加载分类失败', e)
  }
}

async function loadProducts() {
  loading.value = true
  try {
    const params = {
      page: page.value,
      pageSize: pageSize.value,
    }
    if (searchKeyword.value) params.keyword = searchKeyword.value
    if (filterCategory.value) params.categoryId = filterCategory.value
    if (filterStatus.value) params.status = filterStatus.value

    const res = await getProducts(params)
    products.value = res.data?.list || res.data || []
    total.value = res.data?.total || res.data?.length || 0
  } catch (e) {
    ElMessage.error('加载商品失败')
  } finally {
    loading.value = false
  }
}

function showAddDialog() {
  isEdit.value = false
  editingId.value = null
  form.value = getDefaultForm()
  dialogVisible.value = true
}

function showEditDialog(row) {
  isEdit.value = true
  editingId.value = row.id
  form.value = {
    name: row.name,
    categoryPath: row.categoryId || '',
    pointsPrice: row.pointsPrice,
    stock: row.stock,
    description: row.description || '',
    imagesStr: row.images ? JSON.parse(row.images).join(',') : '',
    dateRange: row.validFrom && row.validUntil
      ? [row.validFrom?.substring(0, 10), row.validUntil?.substring(0, 10)]
      : null,
    province: row.province || '',
    city: row.city || '',
    district: row.district || '',
    status: row.status,
  }
  dialogVisible.value = true
}

async function handleSubmit() {
  if (!form.value.name) return ElMessage.warning('请输入商品名称')
  if (!form.value.pointsPrice) return ElMessage.warning('请输入积分价格')

  submitting.value = true
  try {
    const payload = {
      name: form.value.name,
      categoryId: form.value.categoryPath || null,
      pointsPrice: form.value.pointsPrice,
      stock: form.value.stock,
      remainingCount: form.value.stock,
      description: form.value.description || null,
      images: form.value.imagesStr ? JSON.stringify(form.value.imagesStr.split(',').map(s => s.trim()).filter(Boolean)) : null,
      validFrom: form.value.dateRange?.[0] || null,
      validUntil: form.value.dateRange?.[1] || null,
      province: form.value.province || null,
      city: form.value.city || null,
      district: form.value.district || null,
      status: form.value.status,
    }

    if (isEdit.value) {
      await updateProduct(editingId.value, payload)
      ElMessage.success('更新成功')
    } else {
      await createProduct(payload)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    loadProducts()
  } catch (e) {
    ElMessage.error(e.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

async function handleToggleStatus(row, newStatus) {
  try {
    await ElMessageBox.confirm(
      newStatus === 'active' ? `确定上架商品"${row.name}"吗？` : `确定下架商品"${row.name}"吗？`,
      '提示',
      { type: 'warning' }
    )
    await updateProductStatus(row.id, { status: newStatus })
    ElMessage.success(newStatus === 'active' ? '上架成功' : '下架成功')
    loadProducts()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.message || '操作失败')
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定删除商品"${row.name}"吗？此操作不可恢复。`, '提示', { type: 'warning' })
    await deleteProduct(row.id)
    ElMessage.success('删除成功')
    loadProducts()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.message || '删除失败')
  }
}

onMounted(() => {
  loadCategories()
  loadProducts()
})
</script>
