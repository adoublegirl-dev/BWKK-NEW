/**
 * 商品分类服务层
 * 3级树形结构分类管理
 */
const prisma = require('../config/database');
const { ApiError } = require('../utils/response');

// ========== 分类CRUD ==========

/**
 * 创建分类
 */
async function createCategory(data) {
  const { name, parentId, level, sortOrder, status } = data;

  // 如果有父分类，校验父分类存在且层级正确
  if (parentId) {
    const parent = await prisma.productCategory.findUnique({ where: { id: parentId } });
    if (!parent) throw new ApiError(400, '父分类不存在');
    if (parent.level >= 3) throw new ApiError(400, '不能在3级分类下创建子分类');
    // 自动计算层级
    const actualLevel = parent.level + 1;
    if (level && level !== actualLevel) {
      throw new ApiError(400, `层级应为 ${actualLevel}`);
    }
  }

  return prisma.productCategory.create({
    data: {
      name,
      parentId: parentId || null,
      level: level || (parentId ? 2 : 1),
      sortOrder: sortOrder || 0,
      status: status || 'active',
    },
  });
}

/**
 * 获取分类列表（扁平）
 */
async function getCategories({ status, level, parentId }) {
  const where = {};
  if (status) where.status = status;
  if (level) where.level = parseInt(level);
  if (parentId) where.parentId = parentId;
  if (parentId === 'null' || parentId === '') where.parentId = null;

  return prisma.productCategory.findMany({
    where,
    orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
    include: {
      _count: { select: { children: true, products: true } },
    },
  });
}

/**
 * 获取分类树形结构
 */
async function getCategoryTree() {
  const all = await prisma.productCategory.findMany({
    where: { status: 'active' },
    orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }],
    include: {
      _count: { select: { products: true } },
    },
  });

  // 构建树
  const map = {};
  const tree = [];
  all.forEach((cat) => {
    map[cat.id] = { ...cat, children: [] };
  });
  all.forEach((cat) => {
    if (cat.parentId && map[cat.parentId]) {
      map[cat.parentId].children.push(map[cat.id]);
    } else {
      tree.push(map[cat.id]);
    }
  });

  return tree;
}

/**
 * 获取分类详情
 */
async function getCategoryById(id) {
  const category = await prisma.productCategory.findUnique({
    where: { id },
    include: {
      parent: true,
      children: { orderBy: { sortOrder: 'asc' } },
      _count: { select: { products: true, children: true } },
    },
  });
  if (!category) throw new ApiError(404, '分类不存在');
  return category;
}

/**
 * 更新分类
 */
async function updateCategory(id, data) {
  const category = await prisma.productCategory.findUnique({ where: { id } });
  if (!category) throw new ApiError(404, '分类不存在');

  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
  if (data.status !== undefined) updateData.status = data.status;

  if (Object.keys(updateData).length === 0) {
    throw new ApiError(400, '没有需要更新的字段');
  }

  return prisma.productCategory.update({ where: { id }, data: updateData });
}

/**
 * 删除分类
 */
async function deleteCategory(id) {
  const category = await prisma.productCategory.findUnique({
    where: { id },
    include: { _count: { select: { children: true, products: true } } },
  });
  if (!category) throw new ApiError(404, '分类不存在');
  if (category._count.children > 0) throw new ApiError(400, '该分类下有子分类，不能删除');
  if (category._count.products > 0) throw new ApiError(400, '该分类下有商品，不能删除');

  return prisma.productCategory.delete({ where: { id } });
}

module.exports = {
  createCategory,
  getCategories,
  getCategoryTree,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
