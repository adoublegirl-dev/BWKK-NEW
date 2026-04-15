/**
 * HTTP 请求封装
 */
const app = getApp();

/**
 * 通用请求方法
 * @param {Object} options
 * @param {string} options.url - 接口路径（不含baseUrl）
 * @param {string} options.method - 请求方法
 * @param {Object} options.data - 请求数据
 * @param {boolean} options.needAuth - 是否需要认证
 * @param {boolean} options.silent - 是否静默（不显示错误提示）
 */
const request = (options) => {
  return new Promise((resolve, reject) => {
    // 检查是否需要登录
    if (options.needAuth !== false) {
      if (!app.globalData.token) {
        app.login()
          .then(() => doRequest(options, resolve, reject))
          .catch((err) => {
            if (!options.silent) {
              wx.showToast({ title: '请先登录', icon: 'none' });
            }
            reject(err);
          });
        return;
      }
    }

    doRequest(options, resolve, reject);
  });
};

function doRequest(options, resolve, reject) {
  const url = options.url.startsWith('http')
    ? options.url
    : `${app.globalData.baseUrl}${options.url}`;

  const header = {
    'Content-Type': 'application/json',
    ...options.header,
  };

  if (app.globalData.token && options.needAuth !== false) {
    header['Authorization'] = `Bearer ${app.globalData.token}`;
  }

  wx.request({
    url,
    method: options.method || 'GET',
    data: options.data,
    header,
    timeout: options.timeout || 15000,
    success: (res) => {
      // 200~299 都视为成功（201=创建成功、204=删除成功等）
      const isSuccess = res.statusCode >= 200 && res.statusCode < 300 && res.data.code >= 200 && res.data.code < 300;
      if (isSuccess) {
        resolve(res.data);
      } else {
        const msg = res.data?.message || '请求失败';
        if (!options.silent) {
          wx.showToast({ title: msg, icon: 'none' });
        }
        reject(new Error(msg));
      }
    },
    fail: (err) => {
      if (!options.silent) {
        wx.showToast({ title: '网络错误', icon: 'none' });
      }
      reject(err);
    },
  });
}

// 便捷方法
const get = (url, data, options = {}) => request({ url, method: 'GET', data, ...options });
const post = (url, data, options = {}) => request({ url, method: 'POST', data, ...options });
const put = (url, data, options = {}) => request({ url, method: 'PUT', data, ...options });
const del = (url, data, options = {}) => request({ url, method: 'DELETE', data, ...options });

module.exports = { request, get, post, put, del };
