/**
 * 支付策略接口
 * 定义积分和微信支付的统一操作方法
 * 
 * 所有支付实现必须实现以下方法：
 * - freeze:    冻结资金（发单时扣除）
 * - confirm:   确认结算（发单人选中后，积分转给接单人）
 * - refund:    退回资金（超时或取消时退回发单人）
 * - transfer:  转账（补偿发放给未选中接单人）
 * - getBalance: 查询用户余额
 * - getTransactionHistory: 查询交易记录
 */

class PaymentStrategy {
  /**
   * 冻结资金
   * @param {{ userId: string, amount: number, orderId: string, postId: string }} params
   * @returns {{ transactionId: string, frozenAmount: number }}
   */
  async freeze({ userId, amount, orderId, postId }) {
    throw new Error('Method not implemented');
  }

  /**
   * 确认结算 - 将冻结资金转给接单人
   * @param {{ transactionId: string, fromUserId: string, toUserId: string, orderId: string }} params
   * @returns {{ transactionId: string, amount: number }}
   */
  async confirm({ transactionId, fromUserId, toUserId, orderId }) {
    throw new Error('Method not implemented');
  }

  /**
   * 退回资金 - 将冻结资金退回原用户
   * @param {{ transactionId: string, userId: string, orderId: string, reason: string }} params
   * @returns {{ transactionId: string, refundAmount: number }}
   */
  async refund({ transactionId, userId, orderId, reason }) {
    throw new Error('Method not implemented');
  }

  /**
   * 转账 - 用于补偿发放等场景
   * @param {{ fromUserId: string, toUserId: string, amount: number, orderId: string, description: string }} params
   * @returns {{ transactionId: string, amount: number }}
   */
  async transfer({ fromUserId, toUserId, amount, orderId, description }) {
    throw new Error('Method not implemented');
  }

  /**
   * 查询用户余额
   * @param {string} userId
   * @returns {{ availablePoints: number, frozenPoints: number, totalPoints: number }}
   */
  async getBalance(userId) {
    throw new Error('Method not implemented');
  }

  /**
   * 查询交易记录
   * @param {{ userId: string, type?: string, page?: number, pageSize?: number }} params
   * @returns {{ list: Array, total: number }}
   */
  async getTransactionHistory({ userId, type, page = 1, pageSize = 20 }) {
    throw new Error('Method not implemented');
  }
}

module.exports = PaymentStrategy;
