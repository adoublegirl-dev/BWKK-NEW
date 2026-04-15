const app = getApp();
const postApi = require('../../services/post');
const { getCurrentLocation, chooseLocation, getDistance, formatDistance } = require('../../utils/location');

Page({
  data: {
    keyword: '',
    city: '定位中...',
    currentSort: 'latest',
    postList: [],
    page: 1,
    pageSize: 10,
    hasMore: true,
    loading: false,
    countdownMap: {},
    latitude: null,
    longitude: null,
  },

  onLoad() {
    this.initLocation();
  },

  onShow() {
    const city = app.globalData.location.city || '';
    this.setData({ city });
    // 每次显示时刷新列表（从发帖页返回时能看到新帖子）
    this.loadPosts();
  },

  onPullDownRefresh() {
    this.setData({ page: 1, hasMore: true });
    this.loadPosts().then(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) this.loadMore();
  },

  initLocation() {
    getCurrentLocation().then((loc) => {
      this.setData({ latitude: loc.latitude, longitude: loc.longitude, city: loc.city || '当前位置' });
      // 定位成功后，仅在有真实城市名时才按城市筛选
      const city = loc.city || '';
      if (city) {
        this.setData({ city });
        this.loadPosts();
      }
    }).catch(() => {
      this.setData({ city: '' });
    });
  },

  loadPosts() {
    this.setData({ loading: true });
    const params = { page: 1, pageSize: this.data.pageSize, sort: this.data.currentSort };
    const city = this.data.city;
    if (city && !['当前位置', '定位中', '定位中...'].includes(city)) {
      params.city = city;
    }
    if (this.data.latitude && this.data.longitude) {
      params.latitude = this.data.latitude;
      params.longitude = this.data.longitude;
    }
    return postApi.getList(params)
      .then((res) => {
        const list = (Array.isArray(res.data) ? res.data : res.data?.list || []).map(item => this.formatPost(item));
        this.setData({ postList: list, page: 1, hasMore: list.length >= this.data.pageSize, loading: false });
        this.startCountdown();
      }).catch(() => this.setData({ loading: false }));
  },

  loadMore() {
    const nextPage = this.data.page + 1;
    this.setData({ loading: true });
    const params = { page: nextPage, pageSize: this.data.pageSize, sort: this.data.currentSort };
    const city = this.data.city;
    if (city && !['当前位置', '定位中', '定位中...'].includes(city)) {
      params.city = city;
    }
    if (this.data.latitude && this.data.longitude) {
      params.latitude = this.data.latitude;
      params.longitude = this.data.longitude;
    }
    postApi.getList(params)
      .then((res) => {
        const newList = (Array.isArray(res.data) ? res.data : res.data?.list || []).map(item => this.formatPost(item));
        this.setData({ postList: this.data.postList.concat(newList), page: nextPage, hasMore: newList.length >= this.data.pageSize, loading: false });
      }).catch(() => this.setData({ loading: false }));
  },

  formatPost(item) {
    let distance = '';
    if (this.data.latitude && item.latitude) {
      distance = formatDistance(getDistance(this.data.latitude, this.data.longitude, item.latitude, item.longitude));
    }
    return { ...item, distance };
  },

  async onSortChange(e) {
    const sort = e.currentTarget.dataset.sort;
    if (sort === this.data.currentSort) return;

    // 选择"离我最近"时，确保有定位
    if (sort === 'nearest') {
      if (!this.data.latitude || !this.data.longitude) {
        wx.showLoading({ title: '获取定位中...' });
        try {
          const loc = await getCurrentLocation();
          this.setData({
            latitude: loc.latitude,
            longitude: loc.longitude,
            city: loc.city || '当前位置'
          });
        } catch (err) {
          wx.hideLoading();
          wx.showModal({
            title: '需要定位权限',
            content: '使用"离我最近"排序需要获取您的位置，是否去设置？',
            confirmText: '去设置',
            success: (res) => {
              if (res.confirm) {
                wx.openSetting();
              }
            }
          });
          return;
        }
        wx.hideLoading();
      }
    }

    this.setData({ currentSort: sort });
    this.loadPosts();
  },

  // 手动选择位置（地图选点）
  async onChooseCity() {
    try {
      // 打开地图让用户选择位置
      const loc = await chooseLocation();
      this.setData({
        latitude: loc.latitude,
        longitude: loc.longitude,
        city: loc.name || loc.address || '已选位置'
      });
      wx.showToast({ title: '位置已更新', icon: 'success' });
      this.loadPosts();
    } catch (err) {
      // 用户取消选点，不做处理
      if (err.errMsg && err.errMsg.includes('cancel')) {
        return;
      }
      // 选点失败，尝试获取当前定位作为备选
      try {
        const loc = await getCurrentLocation();
        this.setData({
          latitude: loc.latitude,
          longitude: loc.longitude,
          city: loc.city || '当前位置'
        });
        wx.showToast({ title: '已更新为当前位置', icon: 'success' });
        this.loadPosts();
      } catch (locErr) {
        wx.showModal({
          title: '获取定位失败',
          content: '无法获取位置，请检查定位权限',
          confirmText: '去设置',
          success: (res) => {
            if (res.confirm) {
              wx.openSetting();
            }
          }
        });
      }
    }
  },

  onGoCreate() {
    wx.navigateTo({ url: '/pages/post-create/post-create' });
  },

  onGoDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/post-detail/post-detail?id=${id}` });
  },

  startCountdown() {
    if (this._countdownTimer) clearInterval(this._countdownTimer);
    this._countdownTimer = setInterval(() => {
      const now = Date.now();
      const map = {};
      let changed = false;
      this.data.postList.forEach((post) => {
        const deadline = new Date(post.deadline).getTime();
        if (deadline > now) {
          const diff = deadline - now;
          const h = Math.floor(diff / 3600000);
          const m = Math.floor((diff % 3600000) / 60000);
          map[post.id] = h > 0 ? `${h}时${m}分` : `${m}分钟`;
          changed = true;
        } else {
          map[post.id] = '已截止';
        }
      });
      if (changed) this.setData({ countdownMap: map });
    }, 60000);
  },

  onUnload() {
    if (this._countdownTimer) clearInterval(this._countdownTimer);
  },
});
