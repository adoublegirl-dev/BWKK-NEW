/**
 * 地理位置工具
 */
const app = getApp();

/**
 * 获取当前位置
 * @returns {Promise<{latitude, longitude, city, district}>}
 */
const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    // 如果已有位置且不太旧，直接返回
    if (app.globalData.location.latitude) {
      resolve(app.globalData.location);
      return;
    }

    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        const loc = {
          latitude: res.latitude,
          longitude: res.longitude,
          city: app.globalData.location.city || '',
          district: app.globalData.location.district || '',
        };
        app.globalData.location = loc;
        resolve(loc);
      },
      fail: (err) => {
        wx.showToast({ title: '获取位置失败', icon: 'none' });
        reject(err);
      },
    });
  });
};

/**
 * 打开地图选点
 * @returns {Promise<{latitude, longitude, name, address}>}
 */
const chooseLocation = () => {
  return new Promise((resolve, reject) => {
    wx.chooseLocation({
      success: (res) => {
        resolve({
          latitude: res.latitude,
          longitude: res.longitude,
          name: res.name,
          address: res.address,
        });
      },
      fail: reject,
    });
  });
};

/**
 * 计算两点之间的距离（单位：米）
 */
const getDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

/**
 * 格式化距离显示
 * @param {number} meters
 * @returns {string} 例如 "500m" 或 "1.2km"
 */
const formatDistance = (meters) => {
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)}km`;
};

module.exports = { getCurrentLocation, chooseLocation, getDistance, formatDistance };
