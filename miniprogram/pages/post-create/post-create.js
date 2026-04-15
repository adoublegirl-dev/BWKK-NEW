const { chooseLocation } = require('../../utils/location');
const postApi = require('../../services/post');
const paymentApi = require('../../services/payment');
const app = getApp();

Page({
  data: {
    description: '',
    location: null,
    locationName: '',
    reward: 0,
    availablePoints: 100,
    compensateRate: 0,
    deadlineDate: '',
    deadlineTime: '18:00',
    submitting: false,
  },

  onLoad() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.setData({ deadlineDate: tomorrow.toISOString().split('T')[0] });
    this.loadBalance();
  },

  loadBalance() {
    paymentApi.getBalance().then((res) => {
      this.setData({ availablePoints: res.data?.availablePoints || 100 });
    }).catch(() => {});
  },

  onChooseLocation() {
    chooseLocation().then((loc) => {
      this.setData({ location: { latitude: loc.latitude, longitude: loc.longitude }, locationName: loc.name || loc.address });
    }).catch(() => {});
  },

  onDescInput(e) { this.setData({ description: e.detail.value }); },
  onRewardInput(e) {
    let val = parseInt(e.detail.value) || 0;
    if (val > this.data.availablePoints) val = this.data.availablePoints;
    if (val < 0) val = 0;
    this.setData({ reward: val });
  },
  onDateChange(e) { this.setData({ deadlineDate: e.detail.value }); },
  onTimeChange(e) { this.setData({ deadlineTime: e.detail.value }); },
  onCompensateChange(e) { this.setData({ compensateRate: e.detail.value }); },

  onSubmit() {
    const { description, location, reward, deadlineDate, deadlineTime, compensateRate } = this.data;
    if (!description.trim()) return wx.showToast({ title: '请填写需求描述', icon: 'none' });
    if (!location) return wx.showToast({ title: '请选择地点', icon: 'none' });
    if (!deadlineDate || !deadlineTime) return wx.showToast({ title: '请选择截止时间', icon: 'none' });

    const deadline = new Date(`${deadlineDate}T${deadlineTime}:00`);
    if (deadline <= new Date()) return wx.showToast({ title: '截止时间需在当前之后', icon: 'none' });

    if (reward > 0) {
      wx.showModal({
        title: '确认发布',
        content: `将冻结 ${reward} 积分作为悬赏，确认发布？`,
        success: (r) => { if (r.confirm) this._doCreate({ description, location, locationName: this.data.locationName, reward, deadline: deadline.toISOString(), compensateRate }); }
      });
    } else {
      this._doCreate({ description, location, locationName: this.data.locationName, reward: 0, deadline: deadline.toISOString(), compensateRate: 0 });
    }
  },

  _doCreate(data) {
    this.setData({ submitting: true });
    // 字段映射：前端字段 → 后端字段
    const payload = {
      description: data.description,
      locationName: data.locationName,
      latitude: data.location.latitude,
      longitude: data.location.longitude,
      rewardAmount: data.reward,
      compensateRate: Number(data.compensateRate) || 0,
      deadline: data.deadline,
    };
    postApi.create(payload).then(() => {
      wx.showToast({ title: '发布成功' });
      setTimeout(() => wx.navigateBack(), 1500);
    }).catch(() => this.setData({ submitting: false }));
  }
});
