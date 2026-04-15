/**
 * 帮我看看 - 小程序入口
 */
App({
  globalData: {
    // 用户信息
    userInfo: null,
    token: '',
    userId: '',

    // 位置信息
    location: {
      latitude: null,
      longitude: null,
      city: '',
      district: '',
    },

    // API 基础地址
    baseUrl: 'http://localhost:5080/api',
  },

  onLaunch() {
    // 检查登录状态（同步读Storage）
    this.checkLogin();

    // 如果没有token，提前静默登录，避免页面请求时才登录导致超时
    if (!this.globalData.token) {
      this.login().catch((err) => {
        console.warn('[app] 静默登录失败:', err);
      });
    }

    // 获取位置信息
    this.getUserLocation();
  },

  /**
   * 检查用户是否已登录
   */
  checkLogin() {
    const token = wx.getStorageSync('token');
    if (token) {
      this.globalData.token = token;
      this.globalData.userId = wx.getStorageSync('userId');
    }
  },

  /**
   * 获取用户位置
   */
  getUserLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.globalData.location = {
          latitude: res.latitude,
          longitude: res.longitude,
        };
        this.reverseGeocode(res.latitude, res.longitude);
      },
      fail: () => {
        console.log('获取位置失败，使用默认位置');
      },
    });
  },

  /**
   * 逆地址解析 - 将经纬度转为城市信息
   */
  reverseGeocode(lat, lng) {
    const MAP_KEY = 'YOUR_TENCENT_MAP_KEY';
    if (!MAP_KEY || MAP_KEY === 'YOUR_TENCENT_MAP_KEY') {
      console.log('[skip] 腾讯地图Key未配置，跳过逆地址解析');
      return;
    }
    wx.request({
      url: `https://apis.map.qq.com/ws/geocoder/v1/?location=${lat},${lng}&key=${MAP_KEY}`,
      success: (res) => {
        if (res.data.status === 0) {
          const result = res.data.result;
          this.globalData.location.city = result.address_component.city;
          this.globalData.location.district = result.address_component.district;
        }
      },
      fail: () => {
        console.log('逆地址解析失败，跳过');
      },
    });
  },

  /**
   * 微信登录（防并发：多次调用只执行一次）
   */
  _loginPromise: null,
  login() {
    if (this._loginPromise) return this._loginPromise;
    this._loginPromise = new Promise((resolve, reject) => {
      wx.login({
        success: (loginRes) => {
          wx.request({
            url: `${this.globalData.baseUrl}/auth/login`,
            method: 'POST',
            data: { code: loginRes.code },
            timeout: 10000,
            success: (res) => {
              this._loginPromise = null;
              if (res.data.code === 200) {
                const { token, userId, userInfo } = res.data.data;
                this.globalData.token = token;
                this.globalData.userId = userId;
                this.globalData.userInfo = userInfo;
                wx.setStorageSync('token', token);
                wx.setStorageSync('userId', userId);
                resolve(userInfo);
              } else {
                reject(new Error(res.data.message));
              }
            },
            fail: (err) => {
              this._loginPromise = null;
              reject(err);
            },
          });
        },
        fail: (err) => {
          this._loginPromise = null;
          reject(err);
        },
      });
    });
    return this._loginPromise;
  },

  /**
   * 检查登录状态，未登录则跳转登录
   */
  requireAuth() {
    return new Promise((resolve, reject) => {
      if (this.globalData.token) {
        resolve(this.globalData.token);
        return;
      }
      // 尝试静默登录
      this.login()
        .then(() => resolve(this.globalData.token))
        .catch(() => {
          wx.showToast({ title: '请先登录', icon: 'none' });
          reject(new Error('未登录'));
        });
    });
  },
});
