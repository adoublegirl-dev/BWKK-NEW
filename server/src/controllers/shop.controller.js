/**
 * 商城占位控制器
 * MVP阶段返回"即将上线"
 */
const getProducts = async (req, res, next) => {
  try {
    res.json({
      code: 200,
      message: '积分兑换商城即将上线，敬请期待',
      data: {
        comingSoon: true,
        description: '未来可使用积分兑换精美商品',
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getProducts };
