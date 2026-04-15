const orderApi = require('../../services/order');
Page({
  data: {
    tabs: [{ label: '待提交', value: 'pending' }, { label: '已提交', value: 'submitted' }, { label: '已完成', value: 'completed' }, { label: '已失败', value: 'failed' }],
    currentTab: 'pending',
    orders: [],
    loading: false,
  },

  onShow() { this.loadOrders(); },

  onTabChange(e) {
    this.setData({ currentTab: e.currentTarget.dataset.value, orders: [] });
    this.loadOrders();
  },

  loadOrders() {
    this.setData({ loading: true });
    orderApi.getMyOrders({ page: 1, pageSize: 20, status: this.data.currentTab })
      .then((res) => {
        // 兼容：后端返回 data 为数组或 {list: [...]}
        const list = Array.isArray(res.data) ? res.data : res.data?.list || [];
        this.setData({ orders: list, loading: false });
      })
      .catch(() => this.setData({ loading: false }));
  },

  onGoDetail(e) {
    wx.navigateTo({ url: '/pages/post-detail/post-detail?id=' + e.currentTarget.dataset.postid });
  },

  onGoSubmit(e) {
    wx.navigateTo({ url: '/pages/submit-task/submit-task?orderId=' + e.currentTarget.dataset.orderid });
  },
});
