/**
 * 登录认证工具
 */
const app = getApp();

/**
 * 确保已登录，返回用户信息
 */
const ensureLogin = () => {
  return new Promise((resolve, reject) => {
    if (app.globalData.token && app.globalData.userId) {
      resolve({
        token: app.globalData.token,
        userId: app.globalData.userId,
        userInfo: app.globalData.userInfo,
      });
      return;
    }

    app.login()
      .then((userInfo) => {
        resolve({
          token: app.globalData.token,
          userId: app.globalData.userId,
          userInfo,
        });
      })
      .catch(reject);
  });
};

/**
 * 退出登录
 */
const logout = () => {
  app.globalData.token = '';
  app.globalData.userId = '';
  app.globalData.userInfo = null;
  wx.removeStorageSync('token');
  wx.removeStorageSync('userId');
};

/**
 * 检查登录状态
 */
const isLoggedIn = () => {
  return !!app.globalData.token;
};

module.exports = { ensureLogin, logout, isLoggedIn };
