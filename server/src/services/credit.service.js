/**
 * 信用评分服务
 * 双信用分体系：发单信用分和接单信用分
 */
const prisma = require('../config/database');

/**
 * 接单人被差评（发单人操作）
 * @param {string} doerId - 接单人ID
 * @param {string} postId - 帖子ID
 * @param {string} reason - 差评原因
 */
const reportDoer = async (doerId, postId, reason = '任务质量不达标') => {
  const user = await prisma.user.findUnique({ where: { id: doerId } });
  if (!user) throw new Error('用户不存在');

  // 查找最近30天内被差评次数
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentReports = await prisma.creditRecord.count({
    where: {
      userId: doerId,
      type: 'doer',
      change: { lt: 0 },
      createdAt: { gte: thirtyDaysAgo },
    },
  });

  // 每累计3次差评扣5分接单信用分
  if ((recentReports + 1) % 3 === 0) {
    const newScore = Math.max(0, user.doerCredit - 5);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: doerId },
        data: { doerCredit: newScore },
      });

      await tx.creditRecord.create({
        data: {
          userId: doerId,
          type: 'doer',
          change: -5,
          beforeScore: user.doerCredit,
          afterScore: newScore,
          reason: `累计${recentReports + 1}次差评，接单信用分-5：${reason}`,
          relatedPostId: postId,
        },
      });

      if (newScore < 80 && user.creditStatus !== 'frozen') {
        const frozenUntil = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
        await tx.user.update({
          where: { id: doerId },
          data: { creditStatus: 'frozen', frozenUntil },
        });
      }
    });
  } else {
    // 记录差评但不扣分
    await prisma.creditRecord.create({
      data: {
        userId: doerId,
        type: 'doer',
        change: 0,
        beforeScore: user.doerCredit,
        afterScore: user.doerCredit,
        reason: `差评记录：${reason}`,
        relatedPostId: postId,
      },
    });
  }
};

/**
 * 恢复信用分（冷却期结束后，每次完成一个任务+1分）
 * @param {string} userId
 * @param {string} type - 'poster' | 'doer'
 */
const recoverCredit = async (userId, type = 'doer') => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('用户不存在');

  const creditField = type === 'poster' ? 'posterCredit' : 'doerCredit';
  const currentScore = user[creditField];

  if (currentScore >= 100) return; // 已满分不需要恢复

  const newScore = Math.min(100, currentScore + 1);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { [creditField]: newScore },
    });

    await tx.creditRecord.create({
      data: {
        userId,
        type,
        change: 1,
        beforeScore: currentScore,
        afterScore: newScore,
        reason: '完成任务，信用分恢复+1',
      },
    });

    // 如果两个信用分都恢复到80以上，解除冻结
    if (user.creditStatus === 'frozen') {
      const updatedUser = await tx.user.findUnique({ where: { id: userId } });
      if (updatedUser.posterCredit >= 80 && updatedUser.doerCredit >= 80) {
        await tx.user.update({
          where: { id: userId },
          data: { creditStatus: 'normal', frozenUntil: null },
        });
      }
    }
  });
};

/**
 * 获取用户信用记录
 */
const getCreditRecords = async (userId, { page = 1, pageSize = 20, type } = {}) => {
  const where = { userId };
  if (type && type !== 'all') {
    where.type = type;
  }

  const [list, total] = await Promise.all([
    prisma.creditRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.creditRecord.count({ where }),
  ]);

  return { list, total, page, pageSize };
};

module.exports = {
  reportDoer,
  recoverCredit,
  getCreditRecords,
};
