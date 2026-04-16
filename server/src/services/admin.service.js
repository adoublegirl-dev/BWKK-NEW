const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');

const prisma = new PrismaClient();

// ========== 认证 ==========

/**
 * 管理员登录
 */
async function login(username, password) {
  const admin = await prisma.adminUser.findUnique({
    where: { username },
  });

  if (!admin) {
    throw new Error('用户名或密码错误');
  }

  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch) {
    throw new Error('用户名或密码错误');
  }

  // 生成管理员 JWT
  const token = jwt.sign(
    {
      adminId: admin.id,
      username: admin.username,
      role: admin.role,
    },
    config.admin.jwtSecret,
    { expiresIn: config.admin.jwtExpiresIn || '24h' }
  );

  // 更新最后登录时间
  await prisma.adminUser.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });

  // 记录操作日志
  await createLog(admin.id, 'login', null, null, `${admin.username} 登录系统`);

  return {
    token,
    admin: {
      id: admin.id,
      username: admin.username,
      role: admin.role,
      lastLoginAt: admin.lastLoginAt,
    },
  };
}

/**
 * 确保初始管理员存在
 */
async function ensureDefaultAdmin() {
  const count = await prisma.adminUser.count();
  if (count === 0) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await prisma.adminUser.create({
      data: {
        username: 'admin',
        password: hashedPassword,
        role: 'super_admin',
      },
    });
    console.log('✅ 已创建默认管理员账号: admin / admin123');
  }
}

// ========== 操作日志 ==========

/**
 * 创建操作日志
 */
async function createLog(adminId, action, targetType, targetId, detail) {
  try {
    await prisma.adminLog.create({
      data: {
        adminId,
        action,
        targetType: targetType || null,
        targetId: targetId || null,
        detail: typeof detail === 'object' ? JSON.stringify(detail) : (detail || null),
      },
    });
  } catch (err) {
    // 日志记录失败不应影响主流程
    console.error('记录操作日志失败:', err.message);
  }
}

// ========== Dashboard ==========

async function getDashboard() {
  const [
    totalUsers,
    todayUsers,
    totalPosts,
    activePosts,
    totalOrders,
    completedOrders,
    recentUsers,
    recentPosts,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
    prisma.post.count(),
    prisma.post.count({ where: { status: 'active' } }),
    prisma.order.count(),
    prisma.order.count({ where: { status: 'selected' } }),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        nickname: true,
        email: true,
        city: true,
        createdAt: true,
      },
    }),
    prisma.post.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        status: true,
        rewardAmount: true,
        createdAt: true,
        user: { select: { nickname: true, city: true } },
      },
    }),
  ]);

  return {
    totalUsers,
    todayUsers,
    totalPosts,
    activePosts,
    totalOrders,
    completedOrders,
    recentUsers,
    recentPosts,
  };
}

// ========== 用户管理 ==========

async function getUsers({ page = 1, pageSize = 20, keyword = '', creditStatus = '' }) {
  const where = {};

  if (keyword) {
    where.OR = [
      { nickname: { contains: keyword } },
      { email: { contains: keyword } },
      { id: keyword },
    ];
  }

  if (creditStatus) {
    where.creditStatus = creditStatus;
  }

  const [list, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        nickname: true,
        avatarUrl: true,
        email: true,
        emailVerified: true,
        city: true,
        posterCredit: true,
        doerCredit: true,
        creditStatus: true,
        totalPoints: true,
        frozenPoints: true,
        createdAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  return { list, total };
}

async function getUserDetail(id) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          posts: true,
          orders: true,
          transactions: true,
          creditRecords: true,
        },
      },
    },
  });

  if (!user) throw new Error('用户不存在');
  return user;
}

async function updateUser(id, data) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error('用户不存在');

  // 构建更新字段
  const updateData = {};
  const allowedFields = ['nickname', 'city', 'creditStatus'];
  allowedFields.forEach((field) => {
    if (data[field] !== undefined) {
      updateData[field] = data[field];
    }
  });

  if (Object.keys(updateData).length === 0) {
    throw new Error('没有需要更新的字段');
  }

  return prisma.user.update({
    where: { id },
    data: updateData,
  });
}

async function resetUserPassword(id, newPassword) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error('用户不存在');

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id },
    data: { password: hashedPassword },
  });

  return { message: '密码已重置' };
}

async function adjustUserPoints(id, amount, reason) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error('用户不存在');

  if (!Number.isInteger(amount) || amount === 0) {
    throw new Error('调整数量必须为非零整数');
  }

  const beforeBalance = user.totalPoints;
  const afterBalance = beforeBalance + amount;

  if (afterBalance < 0) {
    throw new Error('调整后积分不能为负数');
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id },
      data: { totalPoints: afterBalance },
    }),
    prisma.transaction.create({
      data: {
        userId: id,
        type: amount > 0 ? 'earn' : 'spend',
        amount: Math.abs(amount),
        beforeBalance,
        afterBalance,
        description: `[管理员调整] ${reason}`,
      },
    }),
  ]);

  return { beforeBalance, afterBalance };
}

async function adjustUserCredit(id, type, change, reason) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error('用户不存在');

  if (!['poster', 'doer'].includes(type)) {
    throw new Error('信用分类型必须为 poster 或 doer');
  }

  if (!Number.isInteger(change) || change === 0) {
    throw new Error('变动值必须为非零整数');
  }

  const field = type === 'poster' ? 'posterCredit' : 'doerCredit';
  const beforeScore = user[field];
  const afterScore = beforeScore + change;

  if (afterScore < 0) {
    throw new Error('调整后信用分不能为负数');
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id },
      data: { [field]: afterScore },
    }),
    prisma.creditRecord.create({
      data: {
        userId: id,
        type,
        change,
        beforeScore,
        afterScore,
        reason: `[管理员调整] ${reason}`,
      },
    }),
  ]);

  return { beforeScore, afterScore };
}

// ========== 帖子管理 ==========

async function getPosts({ page = 1, pageSize = 20, status = '', city = '', startTime = '', endTime = '' }) {
  const where = {};

  if (status) {
    where.status = status;
  }

  if (city) {
    where.user = { ...where.user, city };
  }

  if (startTime || endTime) {
    where.createdAt = {};
    if (startTime) where.createdAt.gte = new Date(startTime);
    if (endTime) where.createdAt.lte = new Date(endTime);
  }

  const [list, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: {
          select: { id: true, nickname: true, avatarUrl: true },
        },
        _count: {
          select: { orders: true },
        },
      },
    }),
    prisma.post.count({ where }),
  ]);

  return { list, total };
}

async function getPostDetail(id) {
  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true, nickname: true, avatarUrl: true, city: true },
      },
      orders: {
        include: {
          user: {
            select: { id: true, nickname: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!post) throw new Error('帖子不存在');
  return post;
}

async function updatePostStatus(id, status) {
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) throw new Error('帖子不存在');

  const validStatuses = ['active', 'completed', 'expired', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new Error(`无效的帖子状态: ${status}`);
  }

  return prisma.post.update({
    where: { id },
    data: { status },
  });
}

async function deletePost(id) {
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) throw new Error('帖子不存在');

  // 删除关联的订单
  await prisma.order.deleteMany({ where: { postId: id } });
  // 删除帖子
  await prisma.post.delete({ where: { id } });

  return { message: '帖子已删除' };
}

// ========== 订单管理 ==========

async function getOrders({ page = 1, pageSize = 20, status = '', startTime = '', endTime = '' }) {
  const where = {};

  if (status) {
    where.status = status;
  }

  if (startTime || endTime) {
    where.createdAt = {};
    if (startTime) where.createdAt.gte = new Date(startTime);
    if (endTime) where.createdAt.lte = new Date(endTime);
  }

  const [list, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        post: {
          select: { id: true, title: true },
        },
        user: {
          select: { id: true, nickname: true, avatarUrl: true },
        },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return { list, total };
}

async function getOrderDetail(id) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      post: {
        include: {
          user: {
            select: { id: true, nickname: true },
          },
        },
      },
      user: {
        select: { id: true, nickname: true, avatarUrl: true },
      },
    },
  });

  if (!order) throw new Error('订单不存在');
  return order;
}

// ========== 交易记录 ==========

async function getTransactions({ page = 1, pageSize = 20, userId = '', type = '', startTime = '', endTime = '' }) {
  const where = {};

  if (userId) {
    where.userId = userId;
  }

  if (type) {
    where.type = type;
  }

  if (startTime || endTime) {
    where.createdAt = {};
    if (startTime) where.createdAt.gte = new Date(startTime);
    if (endTime) where.createdAt.lte = new Date(endTime);
  }

  const [list, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: {
          select: { id: true, nickname: true, email: true },
        },
      },
    }),
    prisma.transaction.count({ where }),
  ]);

  return { list, total };
}

// ========== 信用记录 ==========

async function getCreditRecords({ page = 1, pageSize = 20, userId = '', type = '' }) {
  const where = {};

  if (userId) {
    where.userId = userId;
  }

  if (type) {
    where.type = type;
  }

  const [list, total] = await Promise.all([
    prisma.creditRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: {
          select: { id: true, nickname: true, email: true },
        },
      },
    }),
    prisma.creditRecord.count({ where }),
  ]);

  return { list, total };
}

// ========== 操作日志 ==========

async function getLogs({ page = 1, pageSize = 20, action = '', startTime = '', endTime = '' }) {
  const where = {};

  if (action) {
    where.action = action;
  }

  if (startTime || endTime) {
    where.createdAt = {};
    if (startTime) where.createdAt.gte = new Date(startTime);
    if (endTime) where.createdAt.lte = new Date(endTime);
  }

  const [list, total] = await Promise.all([
    prisma.adminLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        admin: {
          select: { id: true, username: true },
        },
      },
    }),
    prisma.adminLog.count({ where }),
  ]);

  return { list, total };
}

module.exports = {
  ensureDefaultAdmin,
  login,
  createLog,
  getDashboard,
  getUsers,
  getUserDetail,
  updateUser,
  resetUserPassword,
  adjustUserPoints,
  adjustUserCredit,
  getPosts,
  getPostDetail,
  updatePostStatus,
  deletePost,
  getOrders,
  getOrderDetail,
  getTransactions,
  getCreditRecords,
  getLogs,
};
