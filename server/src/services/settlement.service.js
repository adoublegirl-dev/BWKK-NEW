/**
 * 结算服务
 * 处理帖子超时、积分退回、补偿等逻辑
 */
const prisma = require('../config/database');
const paymentService = require('./payment.service');

/**
 * 处理超时帖子
 * 每分钟执行一次，检查已过期但状态仍为 active 的帖子
 */
const handleExpiredPosts = async () => {
  try {
    const now = new Date();

    // 查找所有已过期但状态仍为 active 的帖子
    const expiredPosts = await prisma.post.findMany({
      where: {
        status: 'active',
        deadline: { lt: now },
      },
      include: {
        orders: true,
      },
    });

    for (const post of expiredPosts) {
      try {
        await prisma.$transaction(async (tx) => {
          // 标记帖子为过期
          await tx.post.update({
            where: { id: post.id },
            data: { status: 'expired' },
          });

          // 将所有进行中的订单标记为过期
          await tx.order.updateMany({
            where: {
              postId: post.id,
              status: { in: ['accepted', 'submitted'] },
            },
            data: { status: 'expired' },
          });
        });

        // 退回冻结的积分
        if (post.rewardAmount > 0) {
          try {
            const payment = paymentService.getStrategy();
            await payment.refund({
              userId: post.userId,
              orderId: post.id,
              reason: '帖子过期，悬赏积分自动退回',
            });
            console.log(`[Settlement] 帖子 ${post.id} 超时，已退回 ${post.rewardAmount} 积分`);
          } catch (error) {
            console.error(`[Settlement] 帖子 ${post.id} 积分退回失败:`, error.message);
          }
        }

        // 记录发单人未确认，影响信用分
        // 如果有人提交了任务但发单人未确认，计入信用
        const submittedOrders = post.orders.filter(o => o.status === 'submitted');
        if (submittedOrders.length > 0) {
          await recordNoConfirm(post.userId, post.id);
        }
      } catch (error) {
        console.error(`[Settlement] 处理帖子 ${post.id} 失败:`, error.message);
      }
    }

    if (expiredPosts.length > 0) {
      console.log(`[Settlement] 处理了 ${expiredPosts.length} 个超时帖子`);
    }
  } catch (error) {
    console.error('[Settlement] 超时处理任务异常:', error.message);
  }
};

/**
 * 记录发单人未确认行为
 * 连续3次不确认开始扣分
 */
const recordNoConfirm = async (userId, postId) => {
  // 查找最近30天内因超时导致的未确认次数
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentExpiredWithSubmissions = await prisma.post.count({
    where: {
      userId,
      status: 'expired',
      deadline: { gte: thirtyDaysAgo },
      orders: {
        some: { status: 'expired', submittedAt: { not: null } },
      },
    },
  });

  // 每累计3次扣5分发单信用分
  if ((recentExpiredWithSubmissions + 1) % 3 === 0) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const newScore = Math.max(0, user.posterCredit - 5);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { posterCredit: newScore },
      });

      await tx.creditRecord.create({
        data: {
          userId,
          type: 'poster',
          change: -5,
          beforeScore: user.posterCredit,
          afterScore: newScore,
          reason: `累计${recentExpiredWithSubmissions + 1}次超时未确认，发单信用分-5`,
          relatedPostId: postId,
        },
      });

      // 如果信用分低于80，冻结账户
      if (newScore < 80 && user.creditStatus !== 'frozen') {
        const frozenUntil = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
        await tx.user.update({
          where: { id: userId },
          data: { creditStatus: 'frozen', frozenUntil },
        });
        console.log(`[Credit] 用户 ${userId} 发单信用分过低(${newScore})，冻结至 ${frozenUntil}`);
      }
    });
  }
};

/**
 * 解除信用冻结
 * 检查冻结期已到的用户，恢复正常状态
 */
const unfreezeCredit = async () => {
  try {
    const now = new Date();
    const frozenUsers = await prisma.user.findMany({
      where: {
        creditStatus: 'frozen',
        frozenUntil: { lte: now },
      },
    });

    for (const user of frozenUsers) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          creditStatus: 'cooldown',
          frozenUntil: null,
        },
      });
      console.log(`[Credit] 用户 ${user.id} 信用冻结已解除，进入冷却期`);
    }
  } catch (error) {
    console.error('[Credit] 解除冻结任务异常:', error.message);
  }
};

module.exports = {
  handleExpiredPosts,
  recordNoConfirm,
  unfreezeCredit,
};
