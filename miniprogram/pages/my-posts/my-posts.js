const postApi = require('../../services/post');
Page({
  data: {
    tabs: [{ label: '进行中', value: 'active' }, { label: '已完成', value: 'completed' }, { label: '已超时', value: 'expired' }],
    currentTab: 'active',
    posts: [],
    loading: false,
  },

  onShow() { this.loadPosts(); },

  onTabChange(e) {
    this.setData({ currentTab: e.currentTarget.dataset.value, posts: [] });
    this.loadPosts();
  },

  loadPosts() {
    this.setData({ loading: true });
    postApi.getMyPosts({ page: 1, pageSize: 20, status: this.data.currentTab })
      .then((res) => {
        // 兼容：后端返回 data 为数组或 {list: [...]}
        const list = Array.isArray(res.data) ? res.data : res.data?.list || [];
        this.setData({ posts: list, loading: false });
      })
      .catch(() => this.setData({ loading: false }));
  },

  onGoDetail(e) {
    wx.navigateTo({ url: '/pages/post-detail/post-detail?id=' + e.currentTarget.dataset.id });
  },
});
