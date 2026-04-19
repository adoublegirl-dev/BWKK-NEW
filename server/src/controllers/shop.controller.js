/**
 * 积分商城控制器
 */
const shopService = require('../services/shop.service');
const voucherService = require('../services/voucher.service');
const categoryService = require('../services/category.service');
const { ApiError, success, successWithPagination } = require('../utils/response');

// ========== 用户端商品 ==========

async function getProducts(req, res, next) {
  try {
    const { page, pageSize, categoryId, keyword, sort } = req.query;
    const result = await shopService.getShopProducts({
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20,
      categoryId: categoryId || undefined,
      keyword: keyword || undefined,
      sort: sort || 'latest',
    });
    successWithPagination(res, result.list, {
      total: result.total,
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20,
    });
  } catch (err) {
    next(err);
  }
}

async function getProductDetail(req, res, next) {
  try {
    const data = await shopService.getProductById(req.params.id);
    success(res, data);
  } catch (err) {
    next(err);
  }
}

async function exchangeProduct(req, res, next) {
  try {
    const data = await shopService.exchangeProduct(req.user.id, req.params.id);
    success(res, data, '兑换成功', 201);
  } catch (err) {
    next(err);
  }
}

// ========== 用户端兑换记录 ==========

async function getExchangeRecords(req, res, next) {
  try {
    const { page, pageSize, type, status } = req.query;
    const result = await shopService.getExchangeRecords(req.user.id, {
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20,
      type: type || undefined,
      status: status || undefined,
    });
    successWithPagination(res, result.list, {
      total: result.total,
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20,
    });
  } catch (err) {
    next(err);
  }
}

// ========== 用户端代金券 ==========

async function getMyVouchers(req, res, next) {
  try {
    const { page, pageSize, status } = req.query;
    const result = await voucherService.getMyVouchers(req.user.id, {
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20,
      status: status || undefined,
    });
    successWithPagination(res, result.list, {
      total: result.total,
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20,
    });
  } catch (err) {
    next(err);
  }
}

// ========== 用户端分类 ==========

async function getCategories(req, res, next) {
  try {
    const data = await categoryService.getCategoryTree();
    success(res, data);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProducts,
  getProductDetail,
  exchangeProduct,
  getExchangeRecords,
  getMyVouchers,
  getCategories,
};
