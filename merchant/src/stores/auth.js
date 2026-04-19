import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { merchantLogin, getMerchantProfile } from '../api/merchant'

export const useMerchantStore = defineStore('merchant', () => {
  const token = ref(localStorage.getItem('merchant_token') || '')
  const merchantInfo = ref(null)

  const isLoggedIn = computed(() => !!token.value)
  const merchantName = computed(() => merchantInfo.value?.merchantName || '')

  async function login(email, password) {
    const res = await merchantLogin({ email, password })
    token.value = res.data.token
    localStorage.setItem('merchant_token', res.data.token)
    merchantInfo.value = res.data.merchant
    return res
  }

  async function fetchProfile() {
    try {
      const res = await getMerchantProfile()
      merchantInfo.value = res.data
    } catch (e) {
      console.error('获取商家信息失败', e)
    }
  }

  function logout() {
    token.value = ''
    merchantInfo.value = null
    localStorage.removeItem('merchant_token')
  }

  return {
    token,
    merchantInfo,
    isLoggedIn,
    merchantName,
    login,
    fetchProfile,
    logout
  }
})
