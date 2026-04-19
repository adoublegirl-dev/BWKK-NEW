/**
 * 帖子业务逻辑
 */
const prisma = require('../config/database');
const paymentService = require('./payment.service');
const contentSecurity = require('./content-security.service');
const { ApiError } = require('../utils/response');
const { validateRequired, validatePoints, validateCoordinates } = require('../utils/validator');

/**
 * 获取帖子列表
 * @param {{ page?: number, pageSize?: number, sort?: string, city?: string, userId?: string }} params
 */
const getPosts = async ({ page = 1, pageSize = 20, sort = 'latest', city, latitude, longitude, postType }) => {
  const where = { status: 'active' };

  // 按城市筛选（使用 locationName 模糊匹配）
  if (city && !['当前位置', '定位中', '定位中...'].includes(city)) {
    where.locationName = { contains: city };
  }

  // 按帖子类型筛选（normal/merchant/all）
  if (postType && postType !== 'all') {
    where.postType = postType;
  }

  // 排序
  let orderBy = { createdAt: 'desc' };
  if (sort === 'reward') {
    orderBy = { rewardAmount: 'desc' };
  } else if (sort === 'nearest') {
    // Prisma 不支持地理位置排序，用内存排序近似实现
    if (latitude && longitude) {
      const allPosts = await prisma.post.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize * 3, // 多取一些用于排序
        include: {
          user: {
            select: { id: true, nickname: true, avatarUrl: true, posterCredit: true },
          },
          _count: {
            select: { orders: true },
          },
        },
      });

      // 按距离排序
      allPosts.sort((a, b) => {
        const distA = getDistance(latitude, longitude, a.latitude, a.longitude);
        const distB = getDistance(latitude, longitude, b.latitude, b.longitude);
        return distA - distB;
      });

      const list = allPosts.slice(0, pageSize).map(formatPostListItem);
      return { list, total: allPosts.length, page, pageSize };
    }
    // 没有经纬度时退回到最新排序
  }

  const [list, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: {
          select: { id: true, nickname: true, avatarUrl: true, posterCredit: true },
        },
        _count: {
          select: { orders: true },
        },
      },
    }),
    prisma.post.count({ where }),
  ]);

  return {
    list: list.map(formatPostListItem),
    total,
    page,
    pageSize,
  };
};

/**
 * 获取帖子详情
 */
const getPostDetail = async (postId, currentUserId = null) => {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      user: {
        select: { id: true, nickname: true, avatarUrl: true, posterCredit: true, doerCredit: true },
      },
      orders: {
        include: {
          user: {
            select: { id: true, nickname: true, avatarUrl: true, doerCredit: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!post) throw new ApiError(404, '帖子不存在');

  const result = {
    ...post,
    orderCount: post.orders.length,
  };

  // 发单人才能看到提交的内容（内容隔离）
  if (currentUserId && currentUserId === post.userId) {
    result.orders = post.orders.map(order => ({
      ...order,
      description: order.description,
      images: order.images,
    }));
  } else {
    result.orders = post.orders.map(order => ({
      ...order,
      description: null,
      images: null,
    }));
  }

  return result;
};

/**
 * 发布帖子
 */
const createPost = async (userId, postData) => {
  const {
    title, description, locationName, address,
    latitude, longitude, rewardAmount, compensateRate, deadline,
  } = postData;

  // 参数校验
  const requiredCheck = validateRequired(postData, ['description', 'deadline']);
  if (!requiredCheck.valid) {
    throw new ApiError(400, `缺少必填字段: ${requiredCheck.missing.join(', ')}`);
  }

  if (!validatePoints(rewardAmount)) {
    throw new ApiError(400, '悬赏积分必须是非负整数');
  }

  if (compensateRate < 0 || compensateRate > 10) {
    throw new ApiError(400, '补偿比例必须在0-10%之间');
  }

  // 截止时间校验：至少10分钟后，最多7天
  const deadlineTime = new Date(deadline);
  const now = new Date();
  const minDeadline = new Date(now.getTime() + 10 * 60 * 1000);
  const maxDeadline = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  if (deadlineTime < minDeadline) {
    throw new ApiError(400, '截止时间至少为10分钟后');
  }
  if (deadlineTime > maxDeadline) {
    throw new ApiError(400, '截止时间不能超过7天');
  }

  if (latitude && longitude && !validateCoordinates(latitude, longitude)) {
    throw new ApiError(400, '经纬度格式不正确');
  }

  // 内容安全审核
  const textToCheck = [description, title, locationName, address].filter(Boolean).join(' ');
  if (textToCheck.length > 0) {
    const moderation = await contentSecurity.moderateText(textToCheck);
    if (!moderation.pass) {
      throw new ApiError(400, moderation.reason || '内容包含违规信息');
    }
  }

  // 检查用户信用状态
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user.creditStatus === 'frozen') {
    throw new ApiError(403, '您的账户已被冻结，无法发布帖子');
  }

  // 创建帖子
  const post = await prisma.post.create({
    data: {
      userId,
      title: title || '帮我看看',
      description,
      locationName: locationName || null,
      address: address || null,
      latitude: latitude || null,
      longitude: longitude || null,
      rewardAmount: rewardAmount || 0,
      compensateRate: compensateRate || 0,
      deadline: deadlineTime,
    },
  });

  // 如果有悬赏积分，冻结积分
  if (rewardAmount > 0) {
    try {
      const payment = paymentService.getStrategy();
      await payment.freeze({
        userId,
        amount: rewardAmount,
        orderId: post.id, // 使用帖子ID作为订单ID关联冻结交易
        postId: post.id,
      });
    } catch (error) {
      // 积分冻结失败，删除帖子
      await prisma.post.delete({ where: { id: post.id } });
      throw new ApiError(400, error.message || '积分冻结失败');
    }
  }

  return post;
};

/**
 * 更新帖子（仅允许修改未有人接单且未过期的帖子）
 */
const updatePost = async (postId, userId, updateData) => {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { _count: { select: { orders: true } } },
  });

  if (!post) throw new ApiError(404, '帖子不存在');
  if (post.userId !== userId) throw new ApiError(403, '无权修改此帖子');
  if (post.status !== 'active') throw new ApiError(400, '帖子状态不允许修改');
  if (post._count.orders > 0) throw new ApiError(400, '已有接单的帖子不能修改');

  // 如果修改了悬赏积分，需要先退回再重新冻结
  const oldReward = post.rewardAmount;
  const newReward = updateData.rewardAmount ?? oldReward;

  if (newReward !== oldReward && oldReward > 0) {
    // 退回旧积分
    try {
      const payment = paymentService.getStrategy();
      await payment.refund({
        userId,
        orderId: postId,
        reason: '修改帖子退回原悬赏积分',
      });
    } catch (error) {
      throw new ApiError(400, '退回积分失败');
    }
  }

  const updated = await prisma.post.update({
    where: { id: postId },
    data: {
      title: updateData.title ?? undefined,
      description: updateData.description ?? undefined,
      locationName: updateData.locationName ?? undefined,
      address: updateData.address ?? undefined,
      latitude: updateData.latitude ?? undefined,
      longitude: updateData.longitude ?? undefined,
      rewardAmount: newReward,
      compensateRate: updateData.compensateRate ?? undefined,
      deadline: updateData.deadline ? new Date(updateData.deadline) : undefined,
    },
  });

  // 冻结新的悬赏积分
  if (newReward !== oldReward && newReward > 0) {
    try {
      const payment = paymentService.getStrategy();
      await payment.freeze({
        userId,
        amount: newReward,
        orderId: postId,
        postId,
      });
    } catch (error) {
      throw new ApiError(400, error.message || '新积分冻结失败');
    }
  }

  return updated;
};

/**
 * 删除帖子（取消并退回积分）
 */
const deletePost = async (postId, userId) => {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { orders: true },
  });

  if (!post) throw new ApiError(404, '帖子不存在');
  if (post.userId !== userId) throw new ApiError(403, '无权删除此帖子');
  if (post.status !== 'active') throw new ApiError(400, '帖子状态不允许删除');

  // 如果已被接单，不允许取消
  const activeOrders = post.orders.filter(o => o.status !== 'cancelled' && o.status !== 'rejected');
  if (activeOrders.length > 0) throw new ApiError(400, '已有用户接单，无法取消');

  // 如果有悬赏积分，退回
  if (post.rewardAmount > 0) {
    try {
      const payment = paymentService.getStrategy();
      await payment.refund({
        userId,
        orderId: postId,
        reason: '删除帖子退回悬赏积分',
      });
    } catch (error) {
      // 退回失败也允许删除，但记录日志
      console.error('[Post Delete] 积分退回失败:', error.message);
    }
  }

  // 标记帖子为已取消
  await prisma.post.update({
    where: { id: postId },
    data: { status: 'cancelled' },
  });

  return { success: true };
};

/**
 * 获取我的帖子（含未读提交数）
 */
const getMyPosts = async (userId, { page = 1, pageSize = 20, status } = {}) => {
  const where = { userId };
  if (status && status !== 'all') {
    where.status = status;
  }

  const [list, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: { select: { orders: true } },
      },
    }),
    prisma.post.count({ where }),
  ]);

  // 批量查询每个帖子的未读提交数
  // 未读 = status in (submitted, selected) 且 createdAt > lastViewedSubmissionsAt
  const postIds = list.map(p => p.id);
  let unreadMap = {};
  if (postIds.length > 0) {
    // 查询所有帖子的 lastViewedSubmissionsAt
    const postViewTimes = await prisma.post.findMany({
      where: { id: { in: postIds } },
      select: { id: true, lastViewedSubmissionsAt: true },
    });
    const viewTimeMap = {};
    for (const pv of postViewTimes) {
      viewTimeMap[pv.id] = pv.lastViewedSubmissionsAt;
    }

    // 查询所有接单/提交/选中的订单数量
    const submittedCounts = await prisma.order.groupBy({
      by: ['postId'],
      where: {
        postId: { in: postIds },
        status: { in: ['accepted', 'submitted', 'selected'] },
      },
      _count: true,
    });

    const countMap = {};
    for (const sc of submittedCounts) {
      countMap[sc.postId] = sc._count;
    }

    // 查询每个帖子的未读数（accepted用createdAt，submitted/selected用submittedAt）
    for (const p of list) {
      const viewTime = viewTimeMap[p.id];
      if (!viewTime) {
        // 从未查看过，所有接单和提交都是未读
        unreadMap[p.id] = countMap[p.id] || 0;
      } else {
        // 统计查看时间之后新接单的（accepted，用createdAt）
        const newAccepted = await prisma.order.count({
          where: {
            postId: p.id,
            status: 'accepted',
            createdAt: { gt: viewTime },
          },
        });
        // 统计查看时间之后新提交/选中的（submitted/selected，用submittedAt）
        const newSubmitted = await prisma.order.count({
          where: {
            postId: p.id,
            status: { in: ['submitted', 'selected'] },
            submittedAt: { gt: viewTime },
          },
        });
        unreadMap[p.id] = newAccepted + newSubmitted;
      }
    }
  }

  // 计算总未读数（用于入口 badge）
  let totalUnread = 0;
  for (const pid of postIds) {
    totalUnread += unreadMap[pid] || 0;
  }

  const listWithUnread = list.map(p => ({
    ...p,
    unreadSubmissions: unreadMap[p.id] || 0,
  }));

  return { list: listWithUnread, total, page, pageSize, totalUnread };
};

/**
 * 标记帖子的提交列表已读
 */
const viewSubmissions = async (userId, postId) => {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw new ApiError(404, '帖子不存在');
  if (post.userId !== userId) throw new ApiError(403, '无权操作');

  await prisma.post.update({
    where: { id: postId },
    data: { lastViewedSubmissionsAt: new Date() },
  });

  return { success: true };
};

// ========== 内部辅助函数 ==========

/**
 * 计算两个经纬度之间的距离（Haversine 公式，单位：km）
 */
function getDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return Infinity;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * 格式化帖子列表项
 */
function formatPostListItem(post) {
  const now = new Date();
  const isExpired = new Date(post.deadline) < now;
  return {
    id: post.id,
    title: post.title,
    description: post.description.slice(0, 80), // 摘要
    locationName: post.locationName,
    latitude: post.latitude,
    longitude: post.longitude,
    rewardAmount: post.rewardAmount,
    orderCount: post._count.orders,
    deadline: post.deadline,
    status: isExpired ? 'expired' : post.status,
    createdAt: post.createdAt,
    user: post.user,
  };
}

/**
 * 获取帖子未读提交 badge 数
 */
const getPostBadges = async (userId) => {
  // 查找用户所有 active 状态的帖子
  const myPosts = await prisma.post.findMany({
    where: { userId, status: 'active' },
    select: { id: true, lastViewedSubmissionsAt: true },
  });

  let totalUnread = 0;
  for (const post of myPosts) {
    if (post.lastViewedSubmissionsAt) {
      // 查看时间之后新接单的（accepted 状态用 createdAt）
      const newAccepted = await prisma.order.count({
        where: {
          postId: post.id,
          status: 'accepted',
          createdAt: { gt: post.lastViewedSubmissionsAt },
        },
      });
      // 查看时间之后新提交/选中的（submitted/selected 状态用 submittedAt）
      const newSubmitted = await prisma.order.count({
        where: {
          postId: post.id,
          status: { in: ['submitted', 'selected'] },
          submittedAt: { gt: post.lastViewedSubmissionsAt },
        },
      });
      totalUnread += newAccepted + newSubmitted;
    } else {
      // 从未查看过，所有接单（accepted）和提交（submitted/selected）都算未读
      const count = await prisma.order.count({
        where: {
          postId: post.id,
          status: { in: ['accepted', 'submitted', 'selected'] },
        },
      });
      totalUnread += count;
    }
  }

  return { unreadSubmissions: totalUnread };
};

module.exports = {
  getPosts,
  getPostDetail,
  createPost,
  updatePost,
  deletePost,
  getMyPosts,
  viewSubmissions,
  getPostBadges,
};
