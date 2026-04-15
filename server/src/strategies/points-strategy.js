/**
 * 积分支付策略实现
 * MVP阶段的核心支付逻辑
 */
const prisma = require('../config/database');
const PaymentStrategy = require('./payment-strategy');

class PointsStrategy extends PaymentStrategy {
  /**
   * 冻结积分（发单时调用）
   * 从事务中操作：减少可用积分，增加冻结积分，记录交易
   */
  async freeze({ userId, amount, orderId, postId }) {
    if (amount <= 0) return { transactionId: null, frozenAmount: 0 };

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('用户不存在');

    const available = user.totalPoints - user.frozenPoints;
    if (available < amount) throw new Error('积分不足');

    const transaction = await prisma.$transaction(async (tx) => {
      // 更新用户积分：增加冻结
      const updated = await tx.user.update({
        where: { id: userId },
        data: { frozenPoints: { increment: amount } },
      });

      // 记录交易
      const record = await tx.transaction.create({
        data: {
          userId,
          type: 'freeze',
          amount,
          beforeBalance: updated.totalPoints - updated.frozenPoints + amount,
          afterBalance: updated.totalPoints - updated.frozenPoints,
          paymentMode: 'points',
          relatedPostId: postId,
          relatedOrderId: orderId,
          description: `发单冻结 ${amount} 积分`,
        },
      });

      return record;
    });

    return { transactionId: transaction.id, frozenAmount: amount };
  }

  /**
   * 确认结算 - 发单人选中后，将冻结积分转给接单人
   */
  async confirm({ transactionId, fromUserId, toUserId, orderId }) {
    // 查找原始冻结交易
    const freezeTx = await prisma.transaction.findFirst({
      where: { userId: fromUserId, relatedOrderId: orderId, type: 'freeze' },
    });

    if (!freezeTx) throw new Error('未找到冻结交易记录');
    const amount = freezeTx.amount;

    const result = await prisma.$transaction(async (tx) => {
      // 发单人：减少冻结积分和总积分
      const fromUser = await tx.user.update({
        where: { id: fromUserId },
        data: {
          frozenPoints: { decrement: amount },
          totalPoints: { decrement: amount },
        },
      });

      // 接单人：增加总积分
      const toUser = await tx.user.update({
        where: { id: toUserId },
        data: { totalPoints: { increment: amount } },
      });

      // 记录发单人支出
      await tx.transaction.create({
        data: {
          userId: fromUserId,
          type: 'spend',
          amount,
          beforeBalance: fromUser.totalPoints + amount - fromUser.frozenPoints - amount,
          afterBalance: fromUser.totalPoints - fromUser.frozenPoints,
          paymentMode: 'points',
          relatedOrderId: orderId,
          description: `结算支付 ${amount} 积分`,
        },
      });

      // 记录接单人收入
      await tx.transaction.create({
        data: {
          userId: toUserId,
          type: 'earn',
          amount,
          beforeBalance: toUser.totalPoints - amount,
          afterBalance: toUser.totalPoints,
          paymentMode: 'points',
          relatedOrderId: orderId,
          description: `完成任务获得 ${amount} 积分`,
        },
      });

      // 标记原始冻结交易为已结算
      await tx.transaction.update({
        where: { id: freezeTx.id },
        data: { description: `已结算给接单人 ${amount} 积分` },
      });

      // 更新订单状态
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'selected', selectedAt: new Date() },
      });

      return { fromUser, toUser };
    });

    return { transactionId: freezeTx.id, amount };
  }

  /**
   * 退回积分（超时/取消时调用）
   */
  async refund({ transactionId, userId, orderId, reason = '超时退回' }) {
    const freezeTx = await prisma.transaction.findFirst({
      where: { userId, relatedOrderId: orderId, type: 'freeze' },
    });

    if (!freezeTx) throw new Error('未找到冻结交易记录');
    const amount = freezeTx.amount;

    await prisma.$transaction(async (tx) => {
      // 减少冻结积分
      const user = await tx.user.update({
        where: { id: userId },
        data: { frozenPoints: { decrement: amount } },
      });

      // 记录退回交易
      await tx.transaction.create({
        data: {
          userId,
          type: 'refund',
          amount,
          beforeBalance: user.totalPoints - user.frozenPoints - amount,
          afterBalance: user.totalPoints - user.frozenPoints,
          paymentMode: 'points',
          relatedOrderId: orderId,
          description: reason,
        },
      });
    });

    return { transactionId: freezeTx.id, refundAmount: amount };
  }

  /**
   * 转账（补偿发放给未选中接单人）
   */
  async transfer({ fromUserId, toUserId, amount, orderId, description }) {
    if (amount <= 0) return { transactionId: null, amount: 0 };

    await prisma.$transaction(async (tx) => {
      // 发单人减少总积分
      const fromUser = await tx.user.update({
        where: { id: fromUserId },
        data: { totalPoints: { decrement: amount } },
      });

      // 接单人增加总积分
      const toUser = await tx.user.update({
        where: { id: toUserId },
        data: { totalPoints: { increment: amount } },
      });

      // 记录发单人支出
      await tx.transaction.create({
        data: {
          userId: fromUserId,
          type: 'spend',
          amount,
          beforeBalance: fromUser.totalPoints + amount,
          afterBalance: fromUser.totalPoints,
          paymentMode: 'points',
          relatedOrderId: orderId,
          description: description || `补偿支出 ${amount} 积分`,
        },
      });

      // 记录接单人收入
      await tx.transaction.create({
        data: {
          userId: toUserId,
          type: 'compensate',
          amount,
          beforeBalance: toUser.totalPoints - amount,
          afterBalance: toUser.totalPoints,
          paymentMode: 'points',
          relatedOrderId: orderId,
          description: description || `获得补偿 ${amount} 积分`,
        },
      });
    });

    return { amount };
  }

  /**
   * 查询用户积分余额
   */
  async getBalance(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { totalPoints: true, frozenPoints: true },
    });

    if (!user) throw new Error('用户不存在');

    return {
      totalPoints: user.totalPoints,
      frozenPoints: user.frozenPoints,
      availablePoints: user.totalPoints - user.frozenPoints,
    };
  }

  /**
   * 查询交易记录
   */
  async getTransactionHistory({ userId, type, page = 1, pageSize = 20 }) {
    const where = { userId };
    if (type && type !== 'all') where.type = type;

    const [list, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.transaction.count({ where }),
    ]);

    return { list, total, page, pageSize };
  }
}

module.exports = PointsStrategy;
