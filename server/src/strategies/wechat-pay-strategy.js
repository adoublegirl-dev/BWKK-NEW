/**
 * 微信支付策略（预留骨架）
 * 未来注册个体工商户后实现
 */
class WeChatPayStrategy {
  async freeze() {
    throw new Error('微信支付功能尚未实现，请使用积分模式');
  }
  async confirm() {
    throw new Error('微信支付功能尚未实现');
  }
  async refund() {
    throw new Error('微信支付功能尚未实现');
  }
  async transfer() {
    throw new Error('微信支付功能尚未实现');
  }
  async getBalance() {
    throw new Error('微信支付功能尚未实现');
  }
  async getTransactionHistory() {
    throw new Error('微信支付功能尚未实现');
  }
}

module.exports = WeChatPayStrategy;
