const orderApi = require('../../services/order');
const postApi = require('../../services/post');

Page({
  data: { orderId: '', postId: '', post: null, images: [], description: '', submitting: false },

  onLoad(options) {
    const { orderId, postId } = options;
    this.setData({ orderId, postId });
    if (postId) postApi.getDetail(postId).then((res) => this.setData({ post: res.data })).catch(() => {});
  },

  onChooseImage() {
    const remaining = 5 - this.data.images.length;
    if (remaining <= 0) return wx.showToast({ title: '最多5张图片', icon: 'none' });
    wx.chooseMedia({
      count: remaining, mediaType: ['image'], sizeType: ['compressed'],
      success: (res) => { this.setData({ images: [...this.data.images, ...res.tempFiles.map(f => f.tempFilePath)] }); }
    });
  },

  onRemoveImage(e) {
    const idx = e.currentTarget.dataset.index;
    const images = [...this.data.images];
    images.splice(idx, 1);
    this.setData({ images });
  },

  onDescInput(e) { this.setData({ description: e.detail.value }); },

  onSubmit() {
    const { images, description, orderId } = this.data;
    if (images.length === 0) return wx.showToast({ title: '请上传至少一张图片', icon: 'none' });
    if (!description.trim()) return wx.showToast({ title: '请填写描述', icon: 'none' });

    this.setData({ submitting: true });
    // TODO: 上传图片到COS后获取URL
    orderApi.submitTask(orderId, { images, description }).then(() => {
      wx.showToast({ title: '提交成功' });
      setTimeout(() => wx.navigateBack(), 1500);
    }).catch(() => this.setData({ submitting: false }));
  }
});
