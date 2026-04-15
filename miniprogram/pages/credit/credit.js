const userApi = require('../../services/user');
const { get } = require('../../utils/request');
Page({
  data: { activeTab: 'poster', posterCredit: 100, doerCredit: 100, records: [], loading: false },

  onShow() {
    this.loadProfile();
    this.loadRecords();
  },

  onTabChange(e) {
    // 修复：e.detail.value 是 TDesign 方式，原生组件用 dataset
    const tab = e.currentTarget.dataset.value;
    if (tab) {
      this.setData({ activeTab: tab });
      this.loadRecords();
    }
  },

  // 获取真实信用分
  loadProfile() {
    userApi.getProfile()
      .then((res) => {
        const profile = res.data || res;
        this.setData({
          posterCredit: profile.posterCredit || 100,
          doerCredit: profile.doerCredit || 100,
        });
      })
      .catch(() => {});
  },

  loadRecords() {
    this.setData({ loading: true });
    userApi.getCreditRecords(this.data.activeTab)
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data?.list || [];
        this.setData({ records: list, loading: false });
      })
      .catch((err) => {
        console.error('[credit] 加载失败:', err);
        this.setData({ loading: false });
      });
  },
});
