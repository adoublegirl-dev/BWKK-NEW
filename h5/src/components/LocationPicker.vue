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
      
      <van-list
        v-model:loading="loading"
        :finished="finished"
        finished-text="没有更多了"
        @load="onLoad"
      >
        <van-cell
          v-for="item in poiList"
          :key="item.id"
          :title="item.name"
          :label="item.address"
          @click="selectLocation(item)"
        >
          <template #right-icon>
            <van-icon v-if="selectedId === item.id" name="success" color="#07c160" />
          </template>
        </van-cell>
      </van-list>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Toast } from 'vant'

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
const finished = ref(false)
const locating = ref(false)
const selectedId = ref('')

// 显示值
const displayValue = computed(() => {
  return props.modelValue?.name || ''
})

// 监听搜索关键词变化
watch(searchKeyword, (val) => {
  if (!val) {
    poiList.value = []
    finished.value = false
  }
})

// 搜索地点
const onSearch = async () => {
  if (!searchKeyword.value.trim()) {
    Toast('请输入搜索关键词')
    return
  }
  
  loading.value = true
  finished.value = false
  poiList.value = []
  
  try {
    // 使用高德地图POI搜索
    const result = await searchPOI(searchKeyword.value)
    poiList.value = result
    finished.value = true
  } catch (error) {
    Toast('搜索失败，请重试')
  } finally {
    loading.value = false
  }
}

// 高德地图POI搜索
const searchPOI = (keyword) => {
  return new Promise((resolve, reject) => {
    if (!window.AMap) {
      reject(new Error('地图未加载'))
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
    const address = await reverseGeocode(position.latitude, position.longitude)
    
    const location = {
      id: 'current',
      name: address.name || '当前位置',
      address: address.address,
      latitude: position.latitude,
      longitude: position.longitude
    }
    
    selectLocation(location)
    Toast.success('定位成功')
  } catch (error) {
    Toast.fail('定位失败，请检查定位权限')
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

// 列表加载
const onLoad = () => {
  if (searchKeyword.value) {
    onSearch()
  } else {
    finished.value = true
  }
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
</style>