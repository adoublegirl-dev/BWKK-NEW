<template>
  <div class="location-picker">
    <van-field
      v-model="displayValue"
      :label="label"
      :placeholder="placeholder"
      readonly
      is-link
      @click="showPicker = true"
    />
    
    <van-popup
      v-model:show="showPicker"
      position="bottom"
      round
      :style="{ height: '70%' }"
      @open="onPickerOpen"
      @close="onPickerClose"
    >
      <div class="picker-header">
        <span>选择位置</span>
        <van-icon name="cross" @click="showPicker = false" />
      </div>
      
      <van-search
        v-model="searchKeyword"
        placeholder="搜索地点"
        @search="onSearch"
      />
      
      <div class="location-actions">
        <van-button 
          size="small" 
          type="primary" 
          icon="location-o"
          @click="getCurrentLocation"
          :loading="locating"
        >
          定位当前位置
        </van-button>
      </div>
      
      <div class="poi-list-wrapper">
        <div v-if="loading" class="poi-loading">
          <van-loading size="24px" vertical>加载中...</van-loading>
        </div>
        <template v-else-if="poiList.length > 0">
          <van-cell
            v-for="item in poiList"
            :key="item.id"
            :title="item.name"
            :label="item.address"
            clickable
            @click="selectLocation(item)"
          >
            <template #right-icon>
              <van-icon v-if="selectedId === item.id" name="success" color="#07c160" />
            </template>
          </van-cell>
        </template>
        <div v-else-if="searchKeyword && !loading" class="poi-empty">
          <span>未找到相关地点</span>
        </div>
        <div v-else-if="!searchKeyword && !loading" class="poi-empty">
          <span>请搜索或点击定位按钮获取位置</span>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { showToast, showSuccessToast, showFailToast } from 'vant'

const props = defineProps({
  modelValue: {
    type: Object,
    default: null
  },
  label: {
    type: String,
    default: '位置'
  },
  placeholder: {
    type: String,
    default: '请选择位置'
  }
})

const emit = defineEmits(['update:modelValue'])

const showPicker = ref(false)
const searchKeyword = ref('')
const poiList = ref([])
const loading = ref(false)
const locating = ref(false)
const selectedId = ref('')

// 显示值
const displayValue = computed(() => {
  return props.modelValue?.name || ''
})

// 弹窗打开时重置状态
const onPickerOpen = () => {
  searchKeyword.value = ''
  poiList.value = []
  loading.value = false
  locating.value = false
  // 如果已有选中值，保留 selectedId
}

// 弹窗关闭时清理状态
const onPickerClose = () => {
  loading.value = false
  locating.value = false
}

// 搜索地点
const onSearch = async () => {
  if (!searchKeyword.value.trim()) {
    showToast('请输入搜索关键词')
    return
  }
  
  loading.value = true
  poiList.value = []
  
  try {
    // 使用高德地图POI搜索
    const result = await searchPOI(searchKeyword.value)
    poiList.value = result
    if (result.length === 0) {
      showToast('未找到相关地点')
    }
  } catch (error) {
    showToast('搜索失败，请重试')
  } finally {
    loading.value = false
  }
}

// 高德地图POI搜索
const searchPOI = (keyword) => {
  return new Promise((resolve, reject) => {
    if (!window.AMap) {
      // 高德地图未加载时，使用浏览器定位作为兜底
      resolve([])
      return
    }
    
    const placeSearch = new window.AMap.PlaceSearch({
      pageSize: 20,
      pageIndex: 1
    })
    
    placeSearch.search(keyword, (status, result) => {
      if (status === 'complete' && result.info === 'OK') {
        const pois = result.poiList.pois.map(poi => ({
          id: poi.id,
          name: poi.name,
          address: poi.address,
          latitude: poi.location.lat,
          longitude: poi.location.lng
        }))
        resolve(pois)
      } else {
        resolve([])
      }
    })
  })
}

// 获取当前定位
const getCurrentLocation = async () => {
  locating.value = true
  
  try {
    const position = await getBrowserLocation()
    
    // 反向地理编码获取地址
    let name = '当前位置'
    let address = ''
    
    if (window.AMap) {
      try {
        const addr = await reverseGeocode(position.latitude, position.longitude)
        name = addr.name || '当前位置'
        address = addr.address
      } catch (e) {
        // 反向编码失败，使用默认名称
      }
    }
    
    const location = {
      id: 'current',
      name,
      address,
      latitude: position.latitude,
      longitude: position.longitude
    }
    
    selectLocation(location)
    showSuccessToast('定位成功')
  } catch (error) {
    showFailToast('定位失败，请检查定位权限')
  } finally {
    locating.value = false
  }
}

// 浏览器定位
const getBrowserLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('浏览器不支持定位'))
      return
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        })
      },
      (error) => {
        reject(error)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  })
}

// 反向地理编码
const reverseGeocode = (lat, lng) => {
  return new Promise((resolve, reject) => {
    if (!window.AMap) {
      reject(new Error('地图未加载'))
      return
    }
    
    const geocoder = new window.AMap.Geocoder()
    
    geocoder.getAddress([lng, lat], (status, result) => {
      if (status === 'complete' && result.regeocode) {
        const regeocode = result.regeocode
        resolve({
          name: regeocode.formattedAddress,
          address: regeocode.formattedAddress
        })
      } else {
        reject(new Error('逆地理编码失败'))
      }
    })
  })
}

// 选择位置
const selectLocation = (item) => {
  selectedId.value = item.id
  emit('update:modelValue', item)
  showPicker.value = false
}
</script>

<style scoped>
.location-picker {
  width: 100%;
}

.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  font-size: 16px;
  font-weight: 600;
  border-bottom: 1px solid #f0f0f0;
}

.location-actions {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.poi-list-wrapper {
  flex: 1;
  overflow-y: auto;
  padding-bottom: env(safe-area-inset-bottom);
}

.poi-loading {
  display: flex;
  justify-content: center;
  padding: 32px 0;
}

.poi-empty {
  display: flex;
  justify-content: center;
  padding: 32px 0;
  color: #999;
  font-size: 14px;
}
</style>
