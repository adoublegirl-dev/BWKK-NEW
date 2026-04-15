const paymentApi = require('../../services/payment');
Page({
  data: { availablePoints: 0, frozenPoints: 0, totalEarned: 100, currentFilter: 'all', transactions: [], loading: false },

  onShow() { this.loadData(); },

  onFilterChange(e) {
    this.setData({ currentFilter: e.currentTarget.dataset.type });
    this.loadTransactions();
  },

  loadData() {
    paymentApi.getBalance().then((res) => {
      const d = res.data;
      this.setData({
        availablePoints: d?.availablePoints || d?.totalPoints || 0,
        frozenPoints: d?.frozenPoints || 0,
        totalEarned: d?.totalPoints || d?.availablePoints || 0,
      });
    }).catch(() => {});
    this.loadTransactions();
  },

  loadTransactions() {
    this.setData({ loading: true });
    paymentApi.getTransactions({ page: 1, pageSize: 50, type: this.data.currentFilter === 'all' ? undefined : this.data.currentFilter })
      .then((res) => {
        // 兼容：后端返回 data 为数组或 {list: [...]}
        const list = Array.isArray(res.data) ? res.data : res.data?.list || [];
        this.setData({ transactions: list, loading: false });
      })
      .catch(() => this.setData({ loading: false }));
  },
});
