/**
 * 代金券策略接口
 * 预留微信代金券对接
 */

class VoucherStrategy {
  /**
   * 创建代金券批次
   * @param {object} params
   * @returns {object}
   */
  async createBatch(params) {
    throw new Error('Method not implemented');
  }

  /**
   * 分发代金券给用户
   * @param {object} params
   * @returns {object}
   */
  async distribute(params) {
    throw new Error('Method not implemented');
  }

  /**
   * 核销代金券
   * @param {object} params
   * @returns {object}
   */
  async redeem(params) {
    throw new Error('Method not implemented');
  }

  /**
   * 查询代金券状态
   * @param {string} code
   * @returns {object}
   */
  async query(code) {
    throw new Error('Method not implemented');
  }
}

/**
 * 内部代金券策略（当前实现）
 * 使用本地数据库管理代金券
 */
class InternalVoucherStrategy extends VoucherStrategy {
  async createBatch(params) {
    // 委托给 voucher.service.js
    const voucherService = require('../services/voucher.service');
    return voucherService.createVoucherBatch(params.merchantId, params);
  }

  async distribute(params) {
    const voucherService = require('../services/voucher.service');
    return voucherService.distributeVoucherToUser(params.batchId, params.userId, params.sourceType);
  }

  async redeem(params) {
    const voucherService = require('../services/voucher.service');
    return voucherService.redeemVoucher(params.merchantId, params.redeemCode);
  }

  async query(code) {
    // 内部查询逻辑
    return { code, mode: 'internal' };
  }
}

/**
 * 微信代金券策略（预留）
 * 未来对接微信卡券/代金券接口
 */
class WeChatVoucherStrategy extends VoucherStrategy {
  async createBatch() {
    throw new Error('微信代金券功能尚未实现，请使用内部代金券模式');
  }
  async distribute() {
    throw new Error('微信代金券功能尚未实现');
  }
  async redeem() {
    throw new Error('微信代金券功能尚未实现');
  }
  async query() {
    throw new Error('微信代金券功能尚未实现');
  }
}

/**
 * 获取代金券策略实例
 */
function getVoucherStrategy() {
  const mode = process.env.VOUCHER_MODE || 'internal';
  switch (mode) {
    case 'wechat':
      return new WeChatVoucherStrategy();
    case 'internal':
    default:
      return new InternalVoucherStrategy();
  }
}

module.exports = { VoucherStrategy, InternalVoucherStrategy, WeChatVoucherStrategy, getVoucherStrategy };
