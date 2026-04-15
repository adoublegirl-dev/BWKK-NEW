const app = getApp();
const userApi = require('../../services/user');
const paymentApi = require('../../services/payment');

Page({
  data: { userInfo: null, availablePoints: 0, frozenPoints: 0, posterCredit: 100, doerCredit: 100, creditStatus: 'normal', frozenUntil: '' },

  onShow() { this.loadProfile(); },

  loadProfile() {
    userApi.getProfile().then((res) => {
      const d = res.data;
      this.setData({ userInfo: d, posterCredit: d.posterCredit, doerCredit: d.doerCredit, creditStatus: d.creditStatus, frozenUntil: d.frozenUntil });
    }).catch(() => {});
    paymentApi.getBalance().then((res) => {
      this.setData({ availablePoints: res.data?.availablePoints || 0, frozenPoints: res.data?.frozenPoints || 0 });
    }).catch(() => {});
  },

  onGoPoints() { wx.navigateTo({ url: '/pages/points/points' }); },
  onGoCredit() { wx.navigateTo({ url: '/pages/credit/credit' }); },
  onGoMyPosts() { wx.navigateTo({ url: '/pages/my-posts/my-posts' }); },
  onGoMyOrders() { wx.navigateTo({ url: '/pages/my-orders/my-orders' }); }
});
