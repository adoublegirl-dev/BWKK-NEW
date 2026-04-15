const app = getApp();
const postApi = require('../../services/post');
const orderApi = require('../../services/order');

Page({
  data: { id: '', post: null, actionType: 'idle', isOwner: false, countdown: '', submissions: [], loading: true },

  onLoad(options) {
    if (options.id) { this.setData({ id: options.id }); this.loadDetail(options.id); }
  },

  onUnload() { if (this._timer) clearInterval(this._timer); },

  loadDetail(id) {
    this.setData({ loading: true });
    postApi.getDetail(id).then((res) => {
      const post = res.data;
      const isOwner = post.userId === app.globalData.userId;
      let actionType = 'idle';
      if (isOwner) { actionType = 'owner'; this.loadSubmissions(id); }
      else if (post.myOrderStatus === 'accepted') actionType = 'accepted';
      else if (post.myOrderStatus === 'submitted') actionType = 'submitted';
      this.setData({ post, actionType, isOwner, loading: false });
      this._startCountdown(post.deadline);
    }).catch(() => this.setData({ loading: false }));
  },

  loadSubmissions(id) {
    orderApi.getSubmissions(id).then((res) => this.setData({ submissions: res.data || [] })).catch(() => {});
  },

  _startCountdown(deadline) {
    if (!deadline) return;
    if (this._timer) clearInterval(this._timer);
    const update = () => {
      const diff = new Date(deadline).getTime() - Date.now();
      if (diff <= 0) { this.setData({ countdown: '已截止' }); clearInterval(this._timer); return; }
      const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000);
      this.setData({ countdown: h > 0 ? `${h}时${m}分` : `${m}分钟` });
    };
    update();
    this._timer = setInterval(update, 60000);
  },

  onAccept() {
    orderApi.accept(this.data.id).then(() => {
      wx.showToast({ title: '接单成功' });
      this.setData({ actionType: 'accepted' });
      this.loadDetail(this.data.id);
    });
  },

  onGoSubmit() {
    wx.navigateTo({ url: '/pages/submit-task/submit-task?postId=' + this.data.id });
  },

  onConfirm(e) {
    const orderId = e.currentTarget.dataset.orderid;
    wx.showModal({ title: '确认', content: '确认选择此回复？确认后积分将转给接单人', success: (r) => {
      if (r.confirm) {
        // TODO: 调用结算API
        wx.showToast({ title: '确认成功' });
      }
    }});
  },

  onShareAppMessage() {
    return { title: this.data.post?.title || '帮我看看', path: '/pages/post-detail/post-detail?id=' + this.data.id };
  }
});
