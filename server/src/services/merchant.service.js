/**
 * 商家服务层
 * 商家认证、帖子管理、自动选中、积分调整日志
 */
const prisma = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { ApiError } = require('../utils/response');
const voucherService = require('./voucher.service');

// ========== 商家认证 ==========

/**
 * 商家登录（独立JWT，复用User表role=merchant的用户）
 */
async function merchantLogin(email, password) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new ApiError(401, '邮箱或密码错误');
  if (user.role !== 'merchant') throw new ApiError(403, '该账号不是商家账号');

  // 验证密码
  let isPasswordValid = false;
  if (user.password) {
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      isPasswordValid = await bcrypt.compare(password, user.password);
    } else {
      isPasswordValid = password === user.password;
    }
  }
  if (!isPasswordValid) throw new ApiError(401, '邮箱或密码错误');

  // 签发商家JWT（使用商家独立secret）
  const token = jwt.sign(
    {
      merchantId: user.id,
      email: user.email,
      role: 'merchant',
    },
    config.merchant.jwtSecret,
    { expiresIn: config.merchant.jwtExpiresIn || '24h' }
  );

  return {
    token,
    merchant: {
      id: user.id,
      nickname: user.nickname,
      email: user.email,
      merchantName: user.merchantName,
      merchantDesc: user.merchantDesc,
      totalPoints: user.totalPoints,
    },
  };
}

/**
 * 获取商家信息
 */
async function getMerchantProfile(merchantId) {
  const user = await prisma.user.findUnique({
    where: { id: merchantId },
    select: {
      id: true,
      nickname: true,
      email: true,
      role: true,
      merchantName: true,
      merchantDesc: true,
      merchantContact: true,
      totalPoints: true,
      frozenPoints: true,
    },
  });
  if (!user || user.role !== 'merchant') throw new ApiError(404, '商家不存在');
  return user;
}

/**
 * 更新商家信息
 */
async function updateMerchantProfile(merchantId, data) {
  const updateData = {};
  if (data.merchantName !== undefined) updateData.merchantName = data.merchantName;
  if (data.merchantDesc !== undefined) updateData.merchantDesc = data.merchantDesc;
  if (data.merchantContact !== undefined) updateData.merchantContact = data.merchantContact;

  return prisma.user.update({
    where: { id: merchantId },
    data: updateData,
    select: {
      id: true,
      nickname: true,
      merchantName: true,
      merchantDesc: true,
      merchantContact: true,
    },
  });
}

// ========== 商家帖子管理 ==========

/**
 * 获取商家的帖子列表
 */
async function getMerchantPosts(merchantId, { page = 1, pageSize = 20, status }) {
  const where = { userId: merchantId, postType: 'merchant' };
  if (status) where.status = status;

  const [list, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: { select: { orders: true } },
        voucherBatch: { select: { id: true, name: true, faceValue: true } },
      },
    }),
    prisma.post.count({ where }),
  ]);

  return { list, total };
}

/**
 * 获取商家帖子详情（含接单情况）
 */
async function getMerchantPostDetail(merchantId, postId) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      orders: {
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, nickname: true, avatarUrl: true } },
        },
      },
      voucherBatch: true,
    },
  });

  if (!post) throw new ApiError(404, '帖子不存在');
  if (post.userId !== merchantId) throw new ApiError(403, '无权查看该帖子');

  return post;
}

/**
 * 商家创建帖子
 */
async function createMerchantPost(merchantId, data) {
  const { title, description, rewardAmount, deadline, selectionMode, selectionCount, rewardType, voucherBatchId, locationName, address, latitude, longitude, compensateRate } = data;

  if (!description) throw new ApiError(400, '帖子描述不能为空');
  if (!deadline) throw new ApiError(400, '截止时间不能为空');

  // 商家帖子验证
  if (selectionMode && !['manual', 'random', 'first_n'].includes(selectionMode)) {
    throw new ApiError(400, '无效的选中方式');
  }
  if (rewardType && !['points', 'voucher'].includes(rewardType)) {
    throw new ApiError(400, '无效的奖励类型');
  }

  // 代金券奖励校验
  if (rewardType === 'voucher') {
    if (!voucherBatchId) throw new ApiError(400, '代金券奖励必须选择批次');
    const batch = await prisma.voucherBatch.findUnique({ where: { id: voucherBatchId } });
    if (!batch) throw new ApiError(404, '代金券批次不存在');
    if (batch.merchantId !== merchantId) throw new ApiError(403, '只能使用自己的代金券批次');
    if (batch.remainingQty < (selectionCount || 1)) {
      throw new ApiError(400, '代金券剩余数量不足');
    }
  }

  const postData = {
    userId: merchantId,
    title: title || '商家任务',
    description,
    rewardAmount: rewardAmount || 0,
    compensateRate: compensateRate || 0,
    deadline: new Date(deadline),
    postType: 'merchant',
    selectionMode: selectionMode || 'manual',
    selectionCount: selectionCount || 1,
    rewardType: rewardType || 'points',
    voucherBatchId: rewardType === 'voucher' ? voucherBatchId : null,
  };

  // 位置信息
  if (locationName) postData.locationName = locationName;
  if (address) postData.address = address;
  if (latitude) postData.latitude = parseFloat(latitude);
  if (longitude) postData.longitude = parseFloat(longitude);

  // 积分冻结
  if (rewardType === 'points' && rewardAmount > 0) {
    const user = await prisma.user.findUnique({ where: { id: merchantId } });
    const availablePoints = user.totalPoints - user.frozenPoints;
    if (availablePoints < rewardAmount) {
      throw new ApiError(400, '积分不足，无法发布');
    }
  }

  const post = await prisma.$transaction(async (tx) => {
    const created = await tx.post.create({ data: postData });

    // 冻结积分
    if (postData.rewardType === 'points' && postData.rewardAmount > 0) {
      const user = await tx.user.findUnique({ where: { id: merchantId } });
      const avail = user.totalPoints - user.frozenPoints;
      if (avail < postData.rewardAmount) {
        throw new ApiError(400, '积分不足');
      }

      await tx.user.update({
        where: { id: merchantId },
        data: { frozenPoints: { increment: postData.rewardAmount } },
      });

      await tx.transaction.create({
        data: {
          userId: merchantId,
          type: 'freeze',
          amount: postData.rewardAmount,
          beforeBalance: avail,
          afterBalance: avail - postData.rewardAmount,
          paymentMode: 'points',
          relatedPostId: created.id,
          description: `商家发单冻结 ${postData.rewardAmount} 积分`,
        },
      });
    }

    return created;
  });

  return post;
}

// ========== 商家帖子自动选中 ==========

/**
 * 执行商家帖子自动选中
 */
async function autoSelectMerchantPost(postId) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { orders: true },
  });

  if (!post || post.postType !== 'merchant') return null;
  if (post.status !== 'active') return null;
  if (!post.selectionMode || post.selectionMode === 'manual') return null;

  const selectionCount = post.selectionCount || 1;
  const submittedOrders = post.orders.filter((o) => o.status === 'submitted' || o.status === 'accepted');

  if (submittedOrders.length === 0) return null;

  let selectedOrders = [];

  if (post.selectionMode === 'random') {
    // 随机选中
    const shuffled = [...submittedOrders].sort(() => Math.random() - 0.5);
    selectedOrders = shuffled.slice(0, selectionCount);
  } else if (post.selectionMode === 'first_n') {
    // 按接单时间排序取前N个
    const sorted = [...submittedOrders].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    selectedOrders = sorted.slice(0, selectionCount);
  }

  if (selectedOrders.length === 0) return null;

  // 执行选中 + 奖励发放
  const result = await prisma.$transaction(async (tx) => {
    const selectedUsers = [];

    for (const order of selectedOrders) {
      // 更新订单状态
      await tx.order.update({
        where: { id: order.id },
        data: { status: 'selected', selectedAt: new Date() },
      });

      if (post.rewardType === 'points' && post.rewardAmount > 0) {
        // 积分奖励
        const perUserReward = Math.floor(post.rewardAmount / selectedOrders.length);
        if (perUserReward > 0) {
          const toUser = await tx.user.update({
            where: { id: order.userId },
            data: { totalPoints: { increment: perUserReward } },
          });

          await tx.transaction.create({
            data: {
              userId: order.userId,
              type: 'earn',
              amount: perUserReward,
              beforeBalance: toUser.totalPoints - perUserReward,
              afterBalance: toUser.totalPoints,
              paymentMode: 'points',
              relatedPostId: post.id,
              description: `商家任务自动选中获得 ${perUserReward} 积分`,
            },
          });
        }
      } else if (post.rewardType === 'voucher' && post.voucherBatchId) {
        // 代金券奖励
        await voucherService.distributeVoucherToUser(post.voucherBatchId, order.userId, 'merchant_post');
      }

      selectedUsers.push(order.userId);
    }

    // 驳回其他订单
    const otherOrderIds = submittedOrders
      .filter((o) => !selectedOrders.find((s) => s.id === o.id))
      .map((o) => o.id);

    if (otherOrderIds.length > 0) {
      await tx.order.updateMany({
        where: { id: { in: otherOrderIds } },
        data: { status: 'rejected' },
      });
    }

    // 发单人解冻/结算积分
    if (post.rewardType === 'points' && post.rewardAmount > 0) {
      const actualReward = Math.floor(post.rewardAmount / selectedOrders.length) * selectedOrders.length;
      await tx.user.update({
        where: { id: post.userId },
        data: {
          frozenPoints: { decrement: post.rewardAmount },
          totalPoints: { decrement: actualReward },
        },
      });
    }

    // 标记帖子完成
    await tx.post.update({
      where: { id: postId },
      data: { status: 'completed', autoSelectedAt: new Date() },
    });

    return { selectedCount: selectedOrders.length };
  });

  return result;
}

// ========== 积分调整日志 ==========

/**
 * 创建积分调整日志
 */
async function createPointsAdjustmentLog(adminId, data) {
  const { targetUserId, targetType, amount, reason, beforeBalance, afterBalance } = data;

  return prisma.pointsAdjustmentLog.create({
    data: {
      adminId,
      targetUserId: targetUserId || null,
      targetType: targetType || 'single',
      amount,
      reason,
      beforeBalance,
      afterBalance,
    },
  });
}

/**
 * 获取积分调整日志
 */
async function getPointsAdjustmentLogs({ page = 1, pageSize = 20, targetType }) {
  const where = {};
  if (targetType) where.targetType = targetType;

  const [list, total] = await Promise.all([
    prisma.pointsAdjustmentLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        admin: { select: { id: true, username: true } },
      },
    }),
    prisma.pointsAdjustmentLog.count({ where }),
  ]);

  return { list, total };
}

/**
 * 全量积分调整
 */
async function adjustAllUsersPoints(adminId, amount, reason) {
  if (!Number.isInteger(amount) || amount === 0) {
    throw new ApiError(400, '调整数量必须为非零整数');
  }
  if (!reason) throw new ApiError(400, '调整原因不能为空');

  const result = await prisma.$transaction(async (tx) => {
    // 批量更新
    if (amount > 0) {
      await tx.$executeRaw`UPDATE users SET totalPoints = totalPoints + ${amount}`;
    } else {
      // 减少时确保不小于0
      await tx.$executeRaw`UPDATE users SET totalPoints = CASE WHEN totalPoints + ${amount} < 0 THEN 0 ELSE totalPoints + ${amount} END`;
    }

    // 记录日志
    await tx.pointsAdjustmentLog.create({
      data: {
        adminId,
        targetUserId: null,
        targetType: 'all',
        amount,
        reason,
        beforeBalance: null,
        afterBalance: null,
      },
    });

    const count = await tx.user.count();
    return { adjustedCount: count };
  });

  return result;
}

module.exports = {
  merchantLogin,
  getMerchantProfile,
  updateMerchantProfile,
  getMerchantPosts,
  getMerchantPostDetail,
  createMerchantPost,
  autoSelectMerchantPost,
  createPointsAdjustmentLog,
  getPointsAdjustmentLogs,
  adjustAllUsersPoints,
};
