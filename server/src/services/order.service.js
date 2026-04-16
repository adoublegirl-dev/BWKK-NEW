/**
 * 接单业务逻辑
 */
const prisma = require('../config/database');
const contentSecurity = require('./content-security.service');
const { ApiError } = require('../utils/response');

// 每人同时最多接单数
const MAX_ACTIVE_ORDERS = 3;

/**
 * 接单
 */
const acceptOrder = async (userId, { postId }) => {
  // 查找帖子
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { user: true },
  });

  if (!post) throw new ApiError(404, '帖子不存在');
  if (post.status !== 'active') throw new ApiError(400, '帖子不在接单状态');
  if (post.userId === userId) throw new ApiError(400, '不能接自己的单');

  // 检查是否过期
  if (new Date(post.deadline) < new Date()) {
    throw new ApiError(400, '帖子已过期');
  }

  // 检查用户信用状态
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user.creditStatus === 'frozen') {
    throw new ApiError(403, '您的账户已被冻结，无法接单');
  }

  // 检查是否已接过此单
  const existingOrder = await prisma.order.findUnique({
    where: {
      postId_userId: { postId, userId },
    },
  });
  if (existingOrder) throw new ApiError(400, '您已接过此单');

  // 检查接单上限
  const activeOrders = await prisma.order.count({
    where: {
      userId,
      status: { in: ['accepted', 'submitted'] },
    },
  });
  if (activeOrders >= MAX_ACTIVE_ORDERS) {
    throw new ApiError(400, `最多同时接${MAX_ACTIVE_ORDERS}单，请先完成已有任务`);
  }

  // 创建接单
  const order = await prisma.order.create({
    data: { postId, userId, status: 'accepted' },
  });

  // 更新帖子接单人数
  await prisma.post.update({
    where: { id: postId },
    data: { orderCount: { increment: 1 } },
  });

  return order;
};

/**
 * 提交任务
 */
const submitTask = async (userId, orderId, { description, images }) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { post: true },
  });

  if (!order) throw new ApiError(404, '订单不存在');
  if (order.userId !== userId) throw new ApiError(403, '无权操作此订单');
  if (order.status !== 'accepted') throw new ApiError(400, '订单状态不允许提交');

  // 检查帖子是否过期
  if (new Date(order.post.deadline) < new Date()) {
    throw new ApiError(400, '任务已截止，无法提交');
  }

  // 参数校验
  if (!description && (!images || JSON.parse(images).length === 0)) {
    throw new ApiError(400, '请至少提供文字描述或图片');
  }

  if (description && description.length > 100) {
    throw new ApiError(400, '文字描述不能超过100字');
  }

  if (images) {
    const imageList = JSON.parse(images);
    if (imageList.length > 5) {
      throw new ApiError(400, '最多上传5张图片');
    }
  }

  // 内容安全审核
  if (description) {
    const moderation = await contentSecurity.moderateText(description);
    if (!moderation.pass) {
      throw new ApiError(400, moderation.reason || '内容包含违规信息');
    }
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'submitted',
      description,
      images,
      submittedAt: new Date(),
    },
  });

  return updated;
};

/**
 * 确认选中接单人（发单人操作）
 * 使用数据库事务保证原子性：积分结算、订单状态变更、帖子完成要么全部成功，要么全部回滚
 */
const confirmOrder = async (posterId, orderId) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { post: true },
  });

  if (!order) throw new ApiError(404, '订单不存在');
  if (order.post.userId !== posterId) throw new ApiError(403, '只有发单人可以确认选中');
  if (order.status !== 'submitted') throw new ApiError(400, '只能确认已提交任务的接单');
  if (order.post.status !== 'active') throw new ApiError(400, '帖子状态不允许操作');

  const post = order.post;

  // 使用事务保证原子性
  await prisma.$transaction(async (tx) => {
    // 1. 积分结算：将悬赏积分转给接单人
    if (post.rewardAmount > 0) {
      // 查找冻结交易记录
      const freezeTx = await tx.transaction.findFirst({
        where: { userId: posterId, relatedOrderId: post.id, type: 'freeze' },
      });
      if (!freezeTx) {
        throw new ApiError(500, '未找到冻结交易记录，无法结算');
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
          description: `结算支付 ${amount} 积分`,
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
        data: { description: `已结算给接单人 ${amount} 积分` },
      });
    }

    // 2. 标记选中订单（在事务内，积分结算成功后才更新状态）
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
          // 发单人减少总积分
          const fromUser = await tx.user.update({
            where: { id: posterId },
            data: { totalPoints: { decrement: compensationPerOrder } },
          });

          // 接单人增加总积分
          const toUser = await tx.user.update({
            where: { id: otherOrder.userId },
            data: { totalPoints: { increment: compensationPerOrder } },
          });

          // 记录发单人补偿支出
          await tx.transaction.create({
            data: {
              userId: posterId,
              type: 'spend',
              amount: compensationPerOrder,
              beforeBalance: fromUser.totalPoints + compensationPerOrder,
              afterBalance: fromUser.totalPoints,
              paymentMode: 'points',
              relatedOrderId: post.id,
              description: `未选中补偿 ${compensationPerOrder} 积分`,
            },
          });

          // 记录接单人补偿收入
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
      // 无补偿，直接标记为rejected
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

  return { success: true };
};

/**
 * 获取我的接单记录（含状态点信息）
 */
const getMyOrders = async (userId, { page = 1, pageSize = 20, status } = {}) => {
  const where = { userId };
  if (status && status !== 'all') {
    where.status = status;
  }

  const [list, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        post: {
          select: {
            id: true, title: true, description: true, rewardAmount: true,
            deadline: true, status: true, locationName: true,
          },
        },
      },
    }),
    prisma.order.count({ where }),
  ]);

  // 计算每个订单的状态点颜色
  // - selected + 未查看 → green
  // - submitted(进行中) → blue
  // - selected + 已查看 → gray
  // - submitted + 已查看 → blue (不变)
  // - rejected/expired → 无点
  const listWithDot = list.map(order => {
    let dotColor = null; // null = 不显示点
    if (order.status === 'submitted') {
      dotColor = 'blue'; // 进行中始终蓝点
    } else if (order.status === 'selected') {
      if (!order.lastViewedAt || order.lastViewedAt < order.selectedAt) {
        dotColor = 'green'; // 已完成未查看 → 绿点
      } else {
        dotColor = 'gray'; // 已完成已查看 → 灰点
      }
    }
    return {
      ...order,
      dotColor,
    };
  });

  // 判断是否有红点（入口）：任何进行中的订单都显示红点
  const hasRedDot = list.some(o => o.status === 'submitted');

  return { list: listWithDot, total, page, pageSize, hasRedDot };
};

/**
 * 标记订单已查看（接单人视角）
 */
const viewOrder = async (userId, orderId) => {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new ApiError(404, '订单不存在');
  if (order.userId !== userId) throw new ApiError(403, '无权操作');

  await prisma.order.update({
    where: { id: orderId },
    data: { lastViewedAt: new Date() },
  });

  return { success: true };
};

/**
 * 获取订单相关 badge 信息（红点/未读数）
 */
const getOrderBadges = async (userId) => {
  // 是否有进行中的订单（红点）
  const activeCount = await prisma.order.count({
    where: { userId, status: 'submitted' },
  });

  const hasRedDot = activeCount > 0;

  return { hasRedDot };
};

/**
 * 获取帖子的所有提交（发单人视角）
 */
const getSubmissions = async (posterId, postId) => {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw new ApiError(404, '帖子不存在');
  if (post.userId !== posterId) throw new ApiError(403, '只有发单人可以查看提交');

  const orders = await prisma.order.findMany({
    where: { postId, status: { in: ['submitted', 'selected'] } },
    include: {
      user: {
        select: { id: true, nickname: true, avatarUrl: true, doerCredit: true },
      },
    },
    orderBy: { submittedAt: 'desc' },
  });

  // 内容隔离：只返回摘要信息
  return orders.map(order => ({
    id: order.id,
    status: order.status,
    description: order.description,
    images: order.images,
    submittedAt: order.submittedAt,
    selectedAt: order.selectedAt,
    user: order.user,
  }));
};

module.exports = {
  acceptOrder,
  submitTask,
  confirmOrder,
  getMyOrders,
  getSubmissions,
  viewOrder,
  getOrderBadges,
};
