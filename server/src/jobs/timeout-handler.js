/**
 * 定时任务 - 超时处理 + 商家帖子自动选中 + 代金券过期检查
 * 使用 node-cron 定期检查并处理
 */
const cron = require('node-cron');
const settlementService = require('../services/settlement.service');
const merchantService = require('../services/merchant.service');
const prisma = require('../config/database');

/**
 * 启动所有定时任务
 */
const startJobs = () => {
  // 每分钟检查超时帖子
  cron.schedule('* * * * *', async () => {
    await settlementService.handleExpiredPosts();
  });

  // 每小时检查信用冻结解除
  cron.schedule('0 * * * *', async () => {
    await settlementService.unfreezeCredit();
  });

  // 每分钟检查商家帖子到期自动选中
  cron.schedule('* * * * *', async () => {
    await handleMerchantAutoSelection();
  });

  // 每天凌晨2点检查代金券过期
  cron.schedule('0 2 * * *', async () => {
    await handleVoucherExpiry();
  });

  console.log('[Cron] 定时任务已启动：');
  console.log('  - 每分钟：检查超时帖子');
  console.log('  - 每小时：检查信用冻结解除');
  console.log('  - 每分钟：检查商家帖子到期自动选中');
  console.log('  - 每天2点：检查代金券过期');
};

/**
 * 处理商家帖子到期自动选中
 */
async function handleMerchantAutoSelection() {
  try {
    const now = new Date();

    // 查找到期且未自动选中的商家帖子
    const expiredMerchantPosts = await prisma.post.findMany({
      where: {
        postType: 'merchant',
        status: 'active',
        selectionMode: { in: ['random', 'first_n'] },
        deadline: { lte: now },
        autoSelectedAt: null,
      },
    });

    for (const post of expiredMerchantPosts) {
      try {
        const result = await merchantService.autoSelectMerchantPost(post.id);
        if (result) {
          console.log(`[Cron] 商家帖子 ${post.id} 自动选中完成，选中 ${result.selectedCount} 人`);
        }
      } catch (err) {
        console.error(`[Cron] 商家帖子 ${post.id} 自动选中失败:`, err.message);
      }
    }
  } catch (err) {
    console.error('[Cron] 商家帖子自动选中检查失败:', err.message);
  }
}

/**
 * 处理代金券过期
 */
async function handleVoucherExpiry() {
  try {
    const now = new Date();

    // 过期未使用的代金券
    const result = await prisma.voucherCode.updateMany({
      where: {
        status: 'unused',
        validUntil: { lt: now },
      },
      data: {
        status: 'expired',
      },
    });

    if (result.count > 0) {
      console.log(`[Cron] 已标记 ${result.count} 张代金券为过期`);
    }

    // 同步更新兑换记录状态
    await prisma.exchangeRecord.updateMany({
      where: {
        type: 'voucher',
        status: 'valid',
        validUntil: { lt: now },
      },
      data: {
        status: 'expired',
      },
    });

    // 标记已过期的代金券批次
    const expiredBatches = await prisma.voucherBatch.findMany({
      where: {
        status: 'active',
        remainingQty: 0,
        codes: {
          every: { status: { in: ['used', 'expired'] } },
        },
      },
    });

    if (expiredBatches.length > 0) {
      await prisma.voucherBatch.updateMany({
        where: {
          id: { in: expiredBatches.map((b) => b.id) },
        },
        data: { status: 'expired' },
      });
      console.log(`[Cron] 已标记 ${expiredBatches.length} 个代金券批次为过期`);
    }
  } catch (err) {
    console.error('[Cron] 代金券过期检查失败:', err.message);
  }
}

module.exports = { startJobs };
