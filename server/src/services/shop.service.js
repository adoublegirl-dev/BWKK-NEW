/**
 * 积分商城服务层
 * 商品CRUD、积分兑换
 */
const prisma = require('../config/database');
const { ApiError } = require('../utils/response');

// ========== 商品管理 ==========

/**
 * 创建商品
 */
async function createProduct(data) {
  const { name, description, images, categoryId, pointsPrice, stock, validFrom, validUntil, province, city, district } = data;

  if (!name || pointsPrice === undefined) {
    throw new ApiError(400, '商品名称和积分价格为必填项');
  }
  if (pointsPrice <= 0) throw new ApiError(400, '积分价格必须大于0');

  // 校验分类
  if (categoryId) {
    const cat = await prisma.productCategory.findUnique({ where: { id: categoryId } });
    if (!cat) throw new ApiError(400, '分类不存在');
  }

  return prisma.shopProduct.create({
    data: {
      name,
      description: description || null,
      images: images ? JSON.stringify(images) : null,
      categoryId: categoryId || null,
      pointsPrice,
      stock: stock || 0,
      exchangedCount: 0,
      remainingCount: stock || 0,
      status: 'draft',
      validFrom: validFrom ? new Date(validFrom) : null,
      validUntil: validUntil ? new Date(validUntil) : null,
      province: province || null,
      city: city || null,
      district: district || null,
    },
    include: { category: true },
  });
}

/**
 * 获取商品列表（管理端，含全部状态）
 */
async function getProducts({ page = 1, pageSize = 20, status, categoryId, keyword }) {
  const where = {};
  if (status) where.status = status;
  if (categoryId) where.categoryId = categoryId;
  if (keyword) {
    where.name = { contains: keyword };
  }

  const [list, total] = await Promise.all([
    prisma.shopProduct.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: Math.min(pageSize, 50),
      include: { category: { select: { id: true, name: true } } },
    }),
    prisma.shopProduct.count({ where }),
  ]);

  // 解析 images JSON
  const parsedList = list.map((p) => ({
    ...p,
    images: p.images ? JSON.parse(p.images) : [],
  }));

  return { list: parsedList, total };
}

/**
 * 获取商品列表（用户端，仅active）
 */
async function getShopProducts({ page = 1, pageSize = 20, categoryId, keyword, sort = 'latest' }) {
  const where = { status: 'active' };

  // 可兑换日期过滤
  const now = new Date();
  where.OR = [
    { validFrom: null, validUntil: null },
    { validFrom: { lte: now }, validUntil: null },
    { validFrom: null, validUntil: { gte: now } },
    { validFrom: { lte: now }, validUntil: { gte: now } },
  ];

  if (categoryId) where.categoryId = categoryId;
  if (keyword) where.name = { contains: keyword };

  // 排序
  let orderBy;
  switch (sort) {
    case 'points_asc': orderBy = { pointsPrice: 'asc' }; break;
    case 'points_desc': orderBy = { pointsPrice: 'desc' }; break;
    case 'popular': orderBy = { exchangedCount: 'desc' }; break;
    default: orderBy = { createdAt: 'desc' }; break;
  }

  const [list, total] = await Promise.all([
    prisma.shopProduct.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: Math.min(pageSize, 50),
      include: { category: { select: { id: true, name: true } } },
    }),
    prisma.shopProduct.count({ where }),
  ]);

  const parsedList = list.map((p) => ({
    ...p,
    images: p.images ? JSON.parse(p.images) : [],
  }));

  return { list: parsedList, total };
}

/**
 * 获取商品详情
 */
async function getProductById(id) {
  const product = await prisma.shopProduct.findUnique({
    where: { id },
    include: { category: { select: { id: true, name: true } } },
  });
  if (!product) throw new ApiError(404, '商品不存在');
  return {
    ...product,
    images: product.images ? JSON.parse(product.images) : [],
  };
}

/**
 * 更新商品
 */
async function updateProduct(id, data) {
  const product = await prisma.shopProduct.findUnique({ where: { id } });
  if (!product) throw new ApiError(404, '商品不存在');

  const updateData = {};
  const allowedFields = ['name', 'description', 'categoryId', 'pointsPrice', 'stock', 'validFrom', 'validUntil', 'province', 'city', 'district'];
  allowedFields.forEach((f) => {
    if (data[f] !== undefined) updateData[f] = data[f];
  });

  if (data.images !== undefined) {
    updateData.images = JSON.stringify(data.images);
  }

  // 同步库存和剩余
  if (data.stock !== undefined) {
    updateData.remainingCount = data.stock - product.exchangedCount;
    if (updateData.remainingCount < 0) {
      throw new ApiError(400, '库存不能小于已兑换数量');
    }
  }

  if (data.validFrom !== undefined) updateData.validFrom = data.validFrom ? new Date(data.validFrom) : null;
  if (data.validUntil !== undefined) updateData.validUntil = data.validUntil ? new Date(data.validUntil) : null;

  return prisma.shopProduct.update({
    where: { id },
    data: updateData,
    include: { category: { select: { id: true, name: true } } },
  });
}

/**
 * 更新商品状态（上下架）
 */
async function updateProductStatus(id, status) {
  const product = await prisma.shopProduct.findUnique({ where: { id } });
  if (!product) throw new ApiError(404, '商品不存在');

  const validStatuses = ['draft', 'active', 'soldout', 'disabled'];
  if (!validStatuses.includes(status)) throw new ApiError(400, `无效状态: ${status}`);

  return prisma.shopProduct.update({
    where: { id },
    data: { status },
  });
}

/**
 * 删除商品
 */
async function deleteProduct(id) {
  const product = await prisma.shopProduct.findUnique({ where: { id } });
  if (!product) throw new ApiError(404, '商品不存在');
  if (product.exchangedCount > 0) throw new ApiError(400, '已有用户兑换该商品，不能删除');

  return prisma.shopProduct.delete({ where: { id } });
}

// ========== 积分兑换 ==========

/**
 * 兑换商品
 */
async function exchangeProduct(userId, productId) {
  const product = await prisma.shopProduct.findUnique({ where: { id: productId } });
  if (!product) throw new ApiError(404, '商品不存在');
  if (product.status !== 'active') throw new ApiError(400, '商品未上架');

  // 日期校验
  const now = new Date();
  if (product.validFrom && new Date(product.validFrom) > now) {
    throw new ApiError(400, '商品尚未开始兑换');
  }
  if (product.validUntil && new Date(product.validUntil) < now) {
    throw new ApiError(400, '商品兑换已截止');
  }

  // 库存校验
  if (product.remainingCount <= 0) throw new ApiError(400, '商品已兑完');

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const availablePoints = user.totalPoints - user.frozenPoints;
  if (availablePoints < product.pointsPrice) throw new ApiError(400, '积分不足');

  // 事务执行兑换
  const result = await prisma.$transaction(async (tx) => {
    // 再次检查积分（防并发）
    const currentUser = await tx.user.findUnique({ where: { id: userId } });
    const currentAvail = currentUser.totalPoints - currentUser.frozenPoints;
    if (currentAvail < product.pointsPrice) {
      throw new ApiError(400, '积分不足');
    }

    // 扣减积分
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: { totalPoints: { decrement: product.pointsPrice } },
    });

    // 扣减库存（防超卖）
    const updatedProduct = await tx.shopProduct.update({
      where: { id: productId },
      data: {
        exchangedCount: { increment: 1 },
        remainingCount: { decrement: 1 },
      },
    });

    if (updatedProduct.remainingCount < 0) {
      throw new ApiError(400, '商品已兑完');
    }

    // 记录交易
    await tx.transaction.create({
      data: {
        userId,
        type: 'spend',
        amount: product.pointsPrice,
        beforeBalance: currentAvail,
        afterBalance: currentAvail - product.pointsPrice,
        paymentMode: 'points',
        description: `兑换商品: ${product.name}`,
      },
    });

    // 创建兑换记录
    const exchangeRecord = await tx.exchangeRecord.create({
      data: {
        userId,
        type: 'shop_product',
        pointsCost: product.pointsPrice,
        productId,
        productName: product.name,
        productImage: product.images ? JSON.parse(product.images)[0] || null : null,
        status: 'valid',
        validFrom: product.validFrom,
        validUntil: product.validUntil,
      },
    });

    return exchangeRecord;
  });

  return result;
}

/**
 * 获取我的兑换记录
 */
async function getExchangeRecords(userId, { page = 1, pageSize = 20, type, status }) {
  const where = { userId };
  if (type) where.type = type;
  if (status) where.status = status;

  const [list, total] = await Promise.all([
    prisma.exchangeRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.exchangeRecord.count({ where }),
  ]);

  return { list, total };
}

module.exports = {
  createProduct,
  getProducts,
  getShopProducts,
  getProductById,
  updateProduct,
  updateProductStatus,
  deleteProduct,
  exchangeProduct,
  getExchangeRecords,
};
