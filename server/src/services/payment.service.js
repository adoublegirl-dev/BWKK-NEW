/**
 * 支付服务 - 策略调度层
 * 根据配置的 PAYMENT_MODE 选择对应的支付策略
 */
const config = require('../config');
const PointsStrategy = require('../strategies/points-strategy');
const WeChatPayStrategy = require('../strategies/wechat-pay-strategy');

// 策略实例缓存
const strategies = {
  points: new PointsStrategy(),
  wechat: new WeChatPayStrategy(),
};

/**
 * 获取当前支付策略
 */
function getStrategy() {
  const mode = config.paymentMode;
  const strategy = strategies[mode];
  if (!strategy) {
    throw new Error(`不支持的支付模式: ${mode}`);
  }
  return strategy;
}

module.exports = {
  getStrategy,
  strategies,
};
