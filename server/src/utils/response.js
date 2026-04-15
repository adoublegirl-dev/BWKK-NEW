/**
 * 统一响应格式工具
 */

class ApiError extends Error {
  constructor(statusCode, message, data = null) {
    super(message);
    this.statusCode = statusCode;
    this.data = data;
    this.isOperational = true;
  }
}

/**
 * 成功响应
 */
const success = (res, data = null, message = 'success', statusCode = 200) => {
  return res.status(statusCode).json({
    code: statusCode,
    message,
    data,
  });
};

/**
 * 分页成功响应
 */
const successWithPagination = (res, data, pagination) => {
  return res.status(200).json({
    code: 200,
    message: 'success',
    data,
    pagination,
  });
};

/**
 * 失败响应
 */
const fail = (res, message = '操作失败', statusCode = 400, data = null) => {
  return res.status(statusCode).json({
    code: statusCode,
    message,
    data,
  });
};

module.exports = { ApiError, success, successWithPagination, fail };
