/**
 * 接单业务逻辑
 */
const prisma = require('../config/database');
const paymentService = require('./payment.service');
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

  // 标记选中订单
  await prisma.order.update({
    where: { id: orderId },
    data: { status: 'selected', selectedAt: new Date() },
  });

  // 积分结算：将悬赏积分转给接单人
  if (post.rewardAmount > 0) {
    try {
      const payment = paymentService.getStrategy();
      await payment.confirm({
        fromUserId: posterId,
        toUserId: order.userId,
        orderId: post.id,
      });
    } catch (error) {
      console.error('[Settlement] 积分结算失败:', error.message);
      throw new ApiError(500, '积分结算失败，请重试');
    }
  }

  // 驳回其他已提交的订单，并发放补偿
  const otherOrders = await prisma.order.findMany({
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

    if (compensationPerOrder > 0) {
      for (const otherOrder of otherOrders) {
        await prisma.order.update({
          where: { id: otherOrder.id },
          data: { status: 'rejected' },
        });

        try {
          const payment = paymentService.getStrategy();
          await payment.transfer({
            fromUserId: posterId,
            toUserId: otherOrder.userId,
            amount: compensationPerOrder,
            orderId: post.id,
            description: `未选中补偿 ${compensationPerOrder} 积分`,
          });
        } catch (error) {
          console.error('[Compensation] 补偿发放失败:', error.message);
        }
      }
    } else {
      // 无补偿，直接标记为rejected
      await prisma.order.updateMany({
        where: {
          postId: post.id,
          status: 'submitted',
          id: { not: orderId },
        },
        data: { status: 'rejected' },
      });
    }
  } else if (otherOrders.length > 0) {
    await prisma.order.updateMany({
      where: {
        postId: post.id,
        status: 'submitted',
        id: { not: orderId },
      },
      data: { status: 'rejected' },
    });
  }

  // 驳回仍在accepted状态的订单
  await prisma.order.updateMany({
    where: {
      postId: post.id,
      status: 'accepted',
    },
    data: { status: 'expired' },
  });

  // 标记帖子完成
  await prisma.post.update({
    where: { id: post.id },
    data: { status: 'completed' },
  });

  return { success: true };
};

/**
 * 获取我的接单记录
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

  return { list, total, page, pageSize };
};

/**
 * 获取帖子的所有提交（发单人视角）
 */
const getSubmissions = async (posterId, postId) => {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw new ApiError(404, '帖子不存在');
  if (post.userId !== posterId) throw new ApiError(403, '只有发单人可以查看提交');

  const orders = await prisma.order.findMany({
    where: { postId, status: 'submitted' },
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
    description: order.description,
    images: order.images,
    submittedAt: order.submittedAt,
    user: order.user,
  }));
};

module.exports = {
  acceptOrder,
  submitTask,
  confirmOrder,
  getMyOrders,
  getSubmissions,
};
