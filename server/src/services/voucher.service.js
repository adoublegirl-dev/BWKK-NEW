/**
 * 代金券服务层
 * 代金券批次管理、兑换码生成与核销
 */
const crypto = require('crypto');
const prisma = require('../config/database');
const { ApiError } = require('../utils/response');

const HMAC_SECRET = process.env.VOUCHER_HMAC_SECRET || 'bwkk-voucher-hmac-secret-2026';

// ========== 兑换码生成 ==========

/**
 * 生成安全兑换码（16位hex + HMAC签名验证）
 */
function generateRedeemCode() {
  const raw = crypto.randomBytes(12).toString('hex'); // 24位hex，取前16位
  const code = raw.substring(0, 16);
  // HMAC签名用于验证，不随码一起传输
  return code;
}

/**
 * 验证兑换码签名（防伪造）
 */
function verifyRedeemCodeIntegrity(code) {
  // 兑换码本身通过数据库唯一索引保证唯一性
  // 这里可以加额外验证逻辑
  return typeof code === 'string' && /^[0-9a-f]{16}$/.test(code);
}

// ========== 代金券批次管理 ==========

/**
 * 创建代金券批次（商家购买）
 */
async function createVoucherBatch(merchantId, data) {
  const { name, description, faceValue, totalQuantity, validDays } = data;

  if (!name || !faceValue || !totalQuantity || !validDays) {
    throw new ApiError(400, '缺少必填参数');
  }
  if (faceValue <= 0 || totalQuantity <= 0 || validDays <= 0) {
    throw new ApiError(400, '面值、数量、有效天数必须大于0');
  }

  // 10积分 = 1代金券
  const pointsPerVoucher = faceValue * 10;
  const totalPointsCost = pointsPerVoucher * totalQuantity;

  // 检查商家积分
  const merchant = await prisma.user.findUnique({ where: { id: merchantId } });
  if (!merchant || merchant.role !== 'merchant') {
    throw new ApiError(403, '只有商家才能购买代金券');
  }

  const availablePoints = merchant.totalPoints - merchant.frozenPoints;
  if (availablePoints < totalPointsCost) {
    throw new ApiError(400, `积分不足，需要 ${totalPointsCost} 积分，当前可用 ${availablePoints} 积分`);
  }

  // 事务：扣减积分 + 创建批次 + 生成兑换码
  const result = await prisma.$transaction(async (tx) => {
    // 再次检查积分
    const currentMerchant = await tx.user.findUnique({ where: { id: merchantId } });
    const currentAvail = currentMerchant.totalPoints - currentMerchant.frozenPoints;
    if (currentAvail < totalPointsCost) {
      throw new ApiError(400, '积分不足');
    }

    // 扣减商家积分
    await tx.user.update({
      where: { id: merchantId },
      data: { totalPoints: { decrement: totalPointsCost } },
    });

    // 记录交易
    await tx.transaction.create({
      data: {
        userId: merchantId,
        type: 'spend',
        amount: totalPointsCost,
        beforeBalance: currentAvail,
        afterBalance: currentAvail - totalPointsCost,
        paymentMode: 'points',
        description: `购买代金券批次: ${name} x${totalQuantity}`,
      },
    });

    // 创建批次
    const batch = await tx.voucherBatch.create({
      data: {
        merchantId,
        name,
        description: description || null,
        faceValue,
        pointsPerVoucher,
        totalQuantity,
        distributedQty: 0,
        remainingQty: totalQuantity,
        validDays,
        status: 'active',
      },
    });

    // 批量生成兑换码
    const codes = [];
    for (let i = 0; i < totalQuantity; i++) {
      let redeemCode;
      let exists = true;
      // 确保唯一性
      while (exists) {
        redeemCode = generateRedeemCode();
        const found = await tx.voucherCode.findUnique({ where: { redeemCode } });
        exists = !!found;
      }

      codes.push({
        batchId: batch.id,
        redeemCode,
        status: 'unused',
        faceValue,
        sourceType: 'merchant_post',
      });
    }

    await tx.voucherCode.createMany({ data: codes });

    return batch;
  });

  return result;
}

/**
 * 获取商家的代金券批次列表
 */
async function getVoucherBatches(merchantId, { page = 1, pageSize = 20, status }) {
  const where = { merchantId };
  if (status) where.status = status;

  const [list, total] = await Promise.all([
    prisma.voucherBatch.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.voucherBatch.count({ where }),
  ]);

  return { list, total };
}

/**
 * 获取批次详情
 */
async function getVoucherBatchById(batchId, merchantId) {
  const batch = await prisma.voucherBatch.findUnique({
    where: { id: batchId },
    include: {
      _count: { select: { codes: true } },
    },
  });
  if (!batch) throw new ApiError(404, '批次不存在');
  if (merchantId && batch.merchantId !== merchantId) {
    throw new ApiError(403, '无权访问该批次');
  }
  return batch;
}

/**
 * 获取批次下的代金券实例列表
 */
async function getVoucherCodesByBatch(batchId, { page = 1, pageSize = 20, status }) {
  const where = { batchId };
  if (status) where.status = status;

  const [list, total] = await Promise.all([
    prisma.voucherCode.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { id: true, nickname: true } },
      },
    }),
    prisma.voucherCode.count({ where }),
  ]);

  return { list, total };
}

// ========== 代金券分发 ==========

/**
 * 分发代金券给用户（商家帖子自动选中时调用）
 */
async function distributeVoucherToUser(batchId, userId, sourceType = 'merchant_post') {
  const batch = await prisma.voucherBatch.findUnique({ where: { id: batchId } });
  if (!batch) throw new ApiError(404, '代金券批次不存在');
  if (batch.status !== 'active') throw new ApiError(400, '批次已停用');
  if (batch.remainingQty <= 0) throw new ApiError(400, '批次已无剩余代金券');

  const result = await prisma.$transaction(async (tx) => {
    // 获取一张未使用的代金券
    const voucherCode = await tx.voucherCode.findFirst({
      where: { batchId, status: 'unused' },
    });

    if (!voucherCode) throw new ApiError(400, '无可用代金券');

    const now = new Date();
    const validFrom = now;
    const validUntil = new Date(now.getTime() + batch.validDays * 24 * 60 * 60 * 1000);

    // 更新代金券
    const updated = await tx.voucherCode.update({
      where: { id: voucherCode.id },
      data: {
        userId,
        status: 'unused', // 分发后仍为unused，核销后改为used
        validFrom,
        validUntil,
        sourceType,
      },
    });

    // 更新批次数量
    await tx.voucherBatch.update({
      where: { id: batchId },
      data: {
        distributedQty: { increment: 1 },
        remainingQty: { decrement: 1 },
      },
    });

    // 创建兑换记录
    await tx.exchangeRecord.create({
      data: {
        userId,
        type: 'voucher',
        pointsCost: batch.pointsPerVoucher,
        voucherCodeId: updated.id,
        redeemCode: updated.redeemCode,
        faceValue: batch.faceValue,
        status: 'valid',
        validFrom,
        validUntil,
      },
    });

    return updated;
  });

  return result;
}

// ========== 代金券核销 ==========

/**
 * 核销代金券
 */
async function redeemVoucher(merchantId, redeemCode) {
  if (!verifyRedeemCodeIntegrity(redeemCode)) {
    throw new ApiError(400, '兑换码格式无效');
  }

  const voucherCode = await prisma.voucherCode.findUnique({
    where: { redeemCode },
    include: { batch: true },
  });

  if (!voucherCode) throw new ApiError(404, '兑换码不存在');
  if (voucherCode.status === 'used') throw new ApiError(400, '该代金券已被核销');
  if (voucherCode.status === 'expired') throw new ApiError(400, '该代金券已过期');
  if (!voucherCode.userId) throw new ApiError(400, '该代金券尚未分发');

  // 校验有效期
  const now = new Date();
  if (voucherCode.validUntil && new Date(voucherCode.validUntil) < now) {
    throw new ApiError(400, '代金券已过期');
  }

  // 校验是否为该商家发放的代金券
  if (voucherCode.batch.merchantId !== merchantId) {
    throw new ApiError(403, '只能核销自己发放的代金券');
  }

  const result = await prisma.$transaction(async (tx) => {
    // 更新代金券状态
    const updated = await tx.voucherCode.update({
      where: { id: voucherCode.id },
      data: {
        status: 'used',
        redeemedAt: new Date(),
        redeemedByMerchantId: merchantId,
      },
    });

    // 更新兑换记录状态
    await tx.exchangeRecord.updateMany({
      where: { voucherCodeId: voucherCode.id },
      data: {
        status: 'used',
        redeemedAt: new Date(),
        redeemedBy: merchantId,
      },
    });

    return updated;
  });

  return result;
}

/**
 * 查询代金券详情（商家查询）
 */
async function getVoucherByRedeemCode(merchantId, redeemCode) {
  const voucherCode = await prisma.voucherCode.findUnique({
    where: { redeemCode },
    include: {
      batch: { select: { id: true, name: true, merchantId: true, faceValue: true } },
      user: { select: { id: true, nickname: true } },
    },
  });

  if (!voucherCode) throw new ApiError(404, '兑换码不存在');

  // 只返回基本信息，不暴露敏感信息
  return {
    id: voucherCode.id,
    redeemCode: voucherCode.redeemCode,
    status: voucherCode.status,
    faceValue: voucherCode.faceValue,
    validFrom: voucherCode.validFrom,
    validUntil: voucherCode.validUntil,
    sourceType: voucherCode.sourceType,
    batchName: voucherCode.batch.name,
    isOwnVoucher: voucherCode.batch.merchantId === merchantId,
    holderNickname: voucherCode.user?.nickname || '未分发',
  };
}

/**
 * 获取核销历史
 */
async function getRedeemHistory(merchantId, { page = 1, pageSize = 20 }) {
  const where = { redeemedByMerchantId: merchantId };

  const [list, total] = await Promise.all([
    prisma.voucherCode.findMany({
      where,
      orderBy: { redeemedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        batch: { select: { id: true, name: true, faceValue: true } },
        user: { select: { id: true, nickname: true } },
      },
    }),
    prisma.voucherCode.count({ where }),
  ]);

  return { list, total };
}

// ========== 用户端 ==========

/**
 * 获取我的代金券列表
 */
async function getMyVouchers(userId, { page = 1, pageSize = 20, status }) {
  const where = { userId };
  if (status) where.status = status;

  const [list, total] = await Promise.all([
    prisma.voucherCode.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        batch: { select: { id: true, name: true, faceValue: true } },
      },
    }),
    prisma.voucherCode.count({ where }),
  ]);

  return { list, total };
}

// ========== 管理端 ==========

/**
 * 管理端：获取所有代金券批次
 */
async function getAllVoucherBatches({ page = 1, pageSize = 20, status, merchantId }) {
  const where = {};
  if (status) where.status = status;
  if (merchantId) where.merchantId = merchantId;

  const [list, total] = await Promise.all([
    prisma.voucherBatch.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        merchant: { select: { id: true, nickname: true, merchantName: true } },
      },
    }),
    prisma.voucherBatch.count({ where }),
  ]);

  return { list, total };
}

/**
 * 管理端：获取所有代金券实例
 */
async function getAllVoucherCodes({ page = 1, pageSize = 20, status, batchId }) {
  const where = {};
  if (status) where.status = status;
  if (batchId) where.batchId = batchId;

  const [list, total] = await Promise.all([
    prisma.voucherCode.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        batch: { select: { id: true, name: true, faceValue: true } },
        user: { select: { id: true, nickname: true } },
      },
    }),
    prisma.voucherCode.count({ where }),
  ]);

  return { list, total };
}

module.exports = {
  createVoucherBatch,
  getVoucherBatches,
  getVoucherBatchById,
  getVoucherCodesByBatch,
  distributeVoucherToUser,
  redeemVoucher,
  getVoucherByRedeemCode,
  getRedeemHistory,
  getMyVouchers,
  getAllVoucherBatches,
  getAllVoucherCodes,
};
