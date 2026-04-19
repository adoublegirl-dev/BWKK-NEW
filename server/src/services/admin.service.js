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
 * 仅在数据库中无任何管理员时创建，密码通过环境变量 ADMIN_DEFAULT_PASSWORD 配置
 */
async function ensureDefaultAdmin() {
  const count = await prisma.adminUser.count();
  if (count === 0) {
    const defaultPwd = process.env.ADMIN_DEFAULT_PASSWORD;
    if (!defaultPwd) {
      console.error('❌ 数据库中无管理员账号，且未配置 ADMIN_DEFAULT_PASSWORD 环境变量');
      console.error('请在 .env 中添加 ADMIN_DEFAULT_PASSWORD=你的密码 后重启');
      return;
    }
    const hashedPassword = await bcrypt.hash(defaultPwd, 10);
    await prisma.adminUser.create({
      data: {
        username: 'admin',
        password: hashedPassword,
        role: 'super_admin',
      },
    });
    console.log('✅ 已创建默认管理员账号（密码来自环境变量）');
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

async function getUsers({ page = 1, pageSize = 20, keyword = '', creditStatus = '', role = '' }) {
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

  if (role) {
    where.role = role;
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
        role: true,
        merchantName: true,
        merchantDesc: true,
        merchantContact: true,
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

async function adjustUserPoints(id, amount, reason, adminId) {
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
    prisma.pointsAdjustmentLog.create({
      data: {
        adminId: adminId || null,
        targetUserId: id,
        targetType: 'single',
        amount,
        reason,
        beforeBalance,
        afterBalance,
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

/**
 * 管理员强制选中某个接单人
 * 复用 confirmOrder 的积分结算逻辑，但跳过发单人权限检查
 */
async function adminConfirmOrder(orderId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { post: true },
  });

  if (!order) throw new Error('订单不存在');
  if (order.status !== 'submitted') throw new Error('只能选中已提交任务的订单');

  const post = order.post;
  const posterId = post.userId;

  // 使用事务保证原子性
  await prisma.$transaction(async (tx) => {
    // 1. 积分结算
    if (post.rewardAmount > 0) {
      const freezeTx = await tx.transaction.findFirst({
        where: { userId: posterId, relatedOrderId: post.id, type: 'freeze' },
      });
      if (!freezeTx) {
        throw new Error('未找到冻结交易记录，无法结算');
      }
      const amount = freezeTx.amount;

      // 发单人：减少冻结积分和总积分
      const fromUser = await tx.user.update({
        where: { id: posterId },
        data: {
          frozenPoints: { decrement: amount },
          totalPoints: { decrement: amount },
        },
      });

      // 接单人：增加总积分
      const toUser = await tx.user.update({
        where: { id: order.userId },
        data: { totalPoints: { increment: amount } },
      });

      // 记录发单人支出
      await tx.transaction.create({
        data: {
          userId: posterId,
          type: 'spend',
          amount,
          beforeBalance: fromUser.totalPoints + amount - fromUser.frozenPoints - amount,
          afterBalance: fromUser.totalPoints - fromUser.frozenPoints,
          paymentMode: 'points',
          relatedOrderId: post.id,
          description: `[管理员操作] 结算支付 ${amount} 积分`,
        },
      });

      // 记录接单人收入
      await tx.transaction.create({
        data: {
          userId: order.userId,
          type: 'earn',
          amount,
          beforeBalance: toUser.totalPoints - amount,
          afterBalance: toUser.totalPoints,
          paymentMode: 'points',
          relatedOrderId: post.id,
          description: `完成任务获得 ${amount} 积分`,
        },
      });

      // 标记冻结交易为已结算
      await tx.transaction.update({
        where: { id: freezeTx.id },
        data: { description: `[管理员操作] 已结算给接单人 ${amount} 积分` },
      });
    }

    // 2. 标记选中订单
    await tx.order.update({
      where: { id: orderId },
      data: { status: 'selected', selectedAt: new Date() },
    });

    // 3. 驳回其他已提交的订单，并发放补偿
    const otherOrders = await tx.order.findMany({
      where: {
        postId: post.id,
        status: 'submitted',
        id: { not: orderId },
      },
    });

    if (otherOrders.length > 0 && post.rewardAmount > 0 && post.compensateRate > 0) {
      const compensationPerOrder = Math.floor(
        post.rewardAmount * post.compensateRate / 100 / otherOrders.length
      );

      for (const otherOrder of otherOrders) {
        await tx.order.update({
          where: { id: otherOrder.id },
          data: { status: 'rejected' },
        });

        if (compensationPerOrder > 0) {
          const fromUser = await tx.user.update({
            where: { id: posterId },
            data: { totalPoints: { decrement: compensationPerOrder } },
          });

          const toUser = await tx.user.update({
            where: { id: otherOrder.userId },
            data: { totalPoints: { increment: compensationPerOrder } },
          });

          await tx.transaction.create({
            data: {
              userId: posterId,
              type: 'spend',
              amount: compensationPerOrder,
              beforeBalance: fromUser.totalPoints + compensationPerOrder,
              afterBalance: fromUser.totalPoints,
              paymentMode: 'points',
              relatedOrderId: post.id,
              description: `[管理员操作] 未选中补偿 ${compensationPerOrder} 积分`,
            },
          });

          await tx.transaction.create({
            data: {
              userId: otherOrder.userId,
              type: 'compensate',
              amount: compensationPerOrder,
              beforeBalance: toUser.totalPoints - compensationPerOrder,
              afterBalance: toUser.totalPoints,
              paymentMode: 'points',
              relatedOrderId: post.id,
              description: `未选中补偿 ${compensationPerOrder} 积分`,
            },
          });
        }
      }
    } else if (otherOrders.length > 0) {
      await tx.order.updateMany({
        where: {
          postId: post.id,
          status: 'submitted',
          id: { not: orderId },
        },
        data: { status: 'rejected' },
      });
    }

    // 4. 驳回仍在accepted状态的订单
    await tx.order.updateMany({
      where: {
        postId: post.id,
        status: 'accepted',
      },
      data: { status: 'expired' },
    });

    // 5. 标记帖子完成
    await tx.post.update({
      where: { id: post.id },
      data: { status: 'completed' },
    });
  });

  return { message: '已强制选中该接单人' };
}

/**
 * 管理员驳回某个接单
 * 不触发积分结算，仅标记为 rejected
 */
async function adminRejectOrder(orderId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { post: true },
  });

  if (!order) throw new Error('订单不存在');
  if (!['accepted', 'submitted'].includes(order.status)) {
    throw new Error('只能驳回已接单或已提交状态的订单');
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { status: 'rejected' },
  });

  return { message: '已驳回该接单' };
}

/**
 * 管理员修改订单状态
 */
async function updateOrderStatus(id, status) {
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) throw new Error('订单不存在');

  const validStatuses = ['accepted', 'submitted', 'selected', 'rejected', 'expired'];
  if (!validStatuses.includes(status)) {
    throw new Error(`无效的订单状态: ${status}`);
  }

  return prisma.order.update({
    where: { id },
    data: { status },
  });
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

// ========== 商家管理 ==========

/**
 * 管理员修改自己的密码
 */
async function changeAdminPassword(adminId, oldPassword, newPassword) {
  const admin = await prisma.adminUser.findUnique({ where: { id: adminId } });
  if (!admin) throw new Error('管理员不存在');

  // 验证旧密码
  const isMatch = await bcrypt.compare(oldPassword, admin.password);
  if (!isMatch) throw new Error('旧密码不正确');

  // 新密码不能与旧密码相同
  const isSame = await bcrypt.compare(newPassword, admin.password);
  if (isSame) throw new Error('新密码不能与旧密码相同');

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.adminUser.update({
    where: { id: adminId },
    data: { password: hashedPassword },
  });

  return { message: '密码修改成功' };
}

async function updateUserRole(id, data) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error('用户不存在');

  const updateData = { role: data.role };
  if (data.role === 'merchant') {
    updateData.merchantName = data.merchantName || null;
    updateData.merchantDesc = data.merchantDesc || null;
    updateData.merchantContact = data.merchantContact || null;
  } else {
    // 取消商家时清空商家信息
    updateData.merchantName = null;
    updateData.merchantDesc = null;
    updateData.merchantContact = null;
  }

  return prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      nickname: true,
      email: true,
      role: true,
      merchantName: true,
      merchantDesc: true,
      merchantContact: true,
    },
  });
}

async function getMerchants({ page = 1, pageSize = 20 }) {
  const where = { role: 'merchant' };

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
        merchantName: true,
        merchantDesc: true,
        merchantContact: true,
        totalPoints: true,
        createdAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  return { list, total };
}

module.exports = {
  ensureDefaultAdmin,
  login,
  changeAdminPassword,
  createLog,
  getDashboard,
  getUsers,
  getUserDetail,
  updateUser,
  resetUserPassword,
  adjustUserPoints,
  adjustUserCredit,
  updateUserRole,
  getMerchants,
  getPosts,
  getPostDetail,
  updatePostStatus,
  deletePost,
  getOrders,
  getOrderDetail,
  adminConfirmOrder,
  adminRejectOrder,
  updateOrderStatus,
  getTransactions,
  getCreditRecords,
  getLogs,
};
