/**
 * 定时任务 - 超时处理
 * 使用 node-cron 定期检查并处理超时帖子
 */
const cron = require('node-cron');
const settlementService = require('../services/settlement.service');

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

  console.log('[Cron] 定时任务已启动：');
  console.log('  - 每分钟：检查超时帖子');
  console.log('  - 每小时：检查信用冻结解除');
};

module.exports = { startJobs };
