<template>
  <div class="login-page">
    <div class="login-header">
      <h1>帮我看看</h1>
      <p>基于地理位置的众包互助社区</p>
    </div>
    
    <div class="login-form">
      <!-- 登录/注册 Tab 切换 -->
      <van-tabs v-model:active="activeTab" animated>
        <!-- 登录 Tab -->
        <van-tab title="登录">
          <!-- 密码登录模式 -->
          <van-form v-if="loginMode === 'password'" @submit="handlePasswordLogin">
            <van-field
              v-model="loginEmailVal"
              name="email"
              label="邮箱"
              placeholder="请输入邮箱地址"
              :rules="[{ required: true, message: '请填写邮箱' }, { validator: validateEmail, message: '邮箱格式错误' }]"
              type="email"
            />
            <van-field
              v-model="loginPasswordVal"
              name="password"
              label="密码"
              placeholder="请输入密码"
              type="password"
              :rules="[{ required: true, message: '请填写密码' }]"
            />
            <div class="submit-btn">
              <van-button
                round
                block
                type="primary"
                native-type="submit"
                :loading="loginLoading"
              >
                登录
              </van-button>
            </div>
            <div class="mode-switch" @click="switchLoginMode('code')">
              忘记密码？使用验证码登录
            </div>
          </van-form>

          <!-- 验证码登录模式 -->
          <van-form v-else @submit="handleCodeLogin">
            <van-field
              v-model="loginEmailVal"
              name="email"
              label="邮箱"
              placeholder="请输入邮箱地址"
              :rules="[{ required: true, message: '请填写邮箱' }, { validator: validateEmail, message: '邮箱格式错误' }]"
              type="email"
            />
            <van-field
              v-model="loginCodeVal"
              name="code"
              label="验证码"
              placeholder="请输入验证码"
              :rules="[{ required: true, message: '请填写验证码' }, { pattern: /^\d{6}$/, message: '请输入6位数字验证码' }]"
              maxlength="6"
              type="digit"
            >
              <template #button>
                <span
                  v-if="countdown > 0"
                  class="countdown-btn countdown-disabled"
                >
                  {{ countdown }}s
                </span>
                <span
                  v-else
                  class="countdown-btn countdown-active"
                  :class="{ 'countdown-loading': sendingCode }"
                  @click="sendCode('login')"
                >
                  {{ sendingCode ? '发送中...' : '发送验证码' }}
                </span>
              </template>
            </van-field>
            <div class="submit-btn">
              <van-button
                round
                block
                type="primary"
                native-type="submit"
                :loading="loginLoading"
              >
                登录
              </van-button>
            </div>
            <div class="mode-switch" @click="switchLoginMode('password')">
              使用密码登录
            </div>
          </van-form>
        </van-tab>

        <!-- 注册 Tab -->
        <van-tab title="注册">
          <van-form @submit="handleRegister">
            <van-field
              v-model="regEmail"
              name="email"
              label="邮箱"
              placeholder="请输入邮箱地址"
              :rules="[{ required: true, message: '请填写邮箱' }, { validator: validateEmail, message: '邮箱格式错误' }]"
              type="email"
            />
            
            <!-- 验证码输入 -->
            <van-field
              v-model="regCode"
              name="code"
              label="验证码"
              placeholder="请输入验证码"
              :rules="[{ required: true, message: '请填写验证码' }, { pattern: /^\d{6}$/, message: '请输入6位数字验证码' }]"
              maxlength="6"
              type="digit"
            >
              <template #button>
                <span
                  v-if="regCountdown > 0"
                  class="countdown-btn countdown-disabled"
                >
                  {{ regCountdown }}s
                </span>
                <span
                  v-else
                  class="countdown-btn countdown-active"
                  :class="{ 'countdown-loading': regSendingCode }"
                  @click="sendCode('register')"
                >
                  {{ regSendingCode ? '发送中...' : '发送验证码' }}
                </span>
              </template>
            </van-field>

            <van-field
              v-model="regNickname"
              name="nickname"
              label="昵称"
              placeholder="设置昵称"
              maxlength="20"
              :rules="[{ required: true, message: '请设置昵称' }]"
            />
            <van-field
              v-model="regPassword"
              name="password"
              label="密码"
              placeholder="设置密码（至少6位）"
              type="password"
              :rules="[{ required: true, message: '请设置密码' }, { validator: validatePassword, message: '密码至少6位' }]"
            />
            <div class="submit-btn">
              <van-button
                round
                block
                type="primary"
                native-type="submit"
                :loading="regLoading"
              >
                注册
              </van-button>
            </div>
          </van-form>
        </van-tab>
      </van-tabs>
    </div>
    
    <div class="login-tips">
      <p>登录即表示同意《用户协议》和《隐私政策》</p>
    </div>
    
    <!-- 微信登录入口（预留） -->
    <div v-if="isWechatEnv" class="wechat-login">
      <van-divider>或</van-divider>
      <van-button round block plain type="success" @click="wechatLogin">
        <van-icon name="wechat" />
        微信一键登录
      </van-button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast, showSuccessToast, showFailToast } from 'vant'
import { useAuthStore } from '@/stores/auth'
import { sendEmailCode, verifyEmailCode, loginEmail, loginPassword } from '@/api/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// Tab 状态
const activeTab = ref(0)

// 登录模式：password 或 code
const loginMode = ref('password')

// 登录表单（两种模式共用邮箱）
const loginEmailVal = ref('')
const loginPasswordVal = ref('')
const loginCodeVal = ref('')
const loginLoading = ref(false)

// 注册表单
const regEmail = ref('')
const regCode = ref('')
const regNickname = ref('')
const regPassword = ref('')
const regLoading = ref(false)

// 验证码倒计时（登录Tab）
const sendingCode = ref(false)
const countdown = ref(0)
let countdownTimer = null
let countdownEndTime = 0

// 验证码倒计时（注册Tab）
const regSendingCode = ref(false)
const regCountdown = ref(0)
let regCountdownTimer = null
let regCountdownEndTime = 0

const isWechatEnv = ref(false)
const verifyToken = ref('')

onMounted(() => {
  // 检测微信环境
  const ua = navigator.userAgent.toLowerCase()
  isWechatEnv.value = ua.includes('micromessenger')
  
  // 如果已登录，跳转到首页
  if (authStore.isLoggedIn) {
    const redirect = route.query.redirect || '/'
    router.replace(redirect)
  }
})

// 组件卸载时清除定时器
onUnmounted(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
  if (regCountdownTimer) {
    clearInterval(regCountdownTimer)
    regCountdownTimer = null
  }
})

// 验证邮箱格式
const validateEmail = (val) => {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val)
}

// 验证密码格式
const validatePassword = (val) => {
  return val && val.length >= 6
}

// 切换登录模式
const switchLoginMode = (mode) => {
  loginMode.value = mode
}

// 启动倒计时（通用）
const startCountdown = (seconds, type = 'login') => {
  if (type === 'login') {
    if (countdownTimer) {
      clearInterval(countdownTimer)
      countdownTimer = null
    }
    countdownEndTime = Date.now() + seconds * 1000
    countdown.value = seconds
    countdownTimer = setInterval(() => {
      const remaining = Math.ceil((countdownEndTime - Date.now()) / 1000)
      if (remaining <= 0) {
        countdown.value = 0
        clearInterval(countdownTimer)
        countdownTimer = null
        countdownEndTime = 0
      } else {
        countdown.value = remaining
      }
    }, 200)
  } else {
    if (regCountdownTimer) {
      clearInterval(regCountdownTimer)
      regCountdownTimer = null
    }
    regCountdownEndTime = Date.now() + seconds * 1000
    regCountdown.value = seconds
    regCountdownTimer = setInterval(() => {
      const remaining = Math.ceil((regCountdownEndTime - Date.now()) / 1000)
      if (remaining <= 0) {
        regCountdown.value = 0
        clearInterval(regCountdownTimer)
        regCountdownTimer = null
        regCountdownEndTime = 0
      } else {
        regCountdown.value = remaining
      }
    }, 200)
  }
}

// 发送验证码
const sendCode = async (type = 'login') => {
  const email = type === 'login' ? loginEmailVal.value : regEmail.value
  const isSending = type === 'login' ? sendingCode : regSendingCode
  const currentCountdown = type === 'login' ? countdown : regCountdown

  if (!validateEmail(email)) {
    showToast('请输入正确的邮箱地址')
    return
  }

  if (isSending.value || currentCountdown.value > 0) {
    return
  }

  isSending.value = true

  try {
    const res = await sendEmailCode({ email, type: 'login' })
    showSuccessToast('验证码已发送，请查收邮件')

    // 测试环境显示验证码
    if (res.code) {
      console.log('测试验证码:', res.code)
    }

    startCountdown(60, type)
  } catch (error) {
    const is429 = error?.response?.status === 429 || 
                  error?.message?.includes('秒后再试')
    if (is429) {
      const match = error.message?.match(/(\d+)秒/)
      const remainingSeconds = match ? parseInt(match[1]) : 60
      showFailToast(error.message || '请稍后再试')
      startCountdown(remainingSeconds, type)
    } else {
      showFailToast(error.message || '发送失败，请重试')
    }
  } finally {
    isSending.value = false
  }
}

// 邮箱+密码登录
const handlePasswordLogin = async () => {
  loginLoading.value = true

  try {
    const res = await loginPassword({
      email: loginEmailVal.value,
      password: loginPasswordVal.value
    })

    authStore.setAuth({
      token: res.token,
      userInfo: res.userInfo,
      loginType: 'email'
    })

    showSuccessToast('欢迎回来')

    const redirect = route.query.redirect || '/'
    router.replace(redirect)
  } catch (error) {
    showFailToast(error.message || '登录失败')
  } finally {
    loginLoading.value = false
  }
}

// 验证码登录（老用户忘记密码时使用）
const handleCodeLogin = async () => {
  loginLoading.value = true

  try {
    // 1. 先验证验证码
    const verifyRes = await verifyEmailCode({
      email: loginEmailVal.value,
      code: loginCodeVal.value
    })

    verifyToken.value = verifyRes.verifyToken

    // 2. 用验证码方式登录
    const res = await loginEmail({
      email: loginEmailVal.value,
      verifyToken: verifyToken.value
    })

    authStore.setAuth({
      token: res.token,
      userInfo: res.userInfo,
      loginType: 'email'
    })

    showSuccessToast('欢迎回来')

    const redirect = route.query.redirect || '/'
    router.replace(redirect)
  } catch (error) {
    showFailToast(error.message || '登录失败')
  } finally {
    loginLoading.value = false
  }
}

// 注册（验证码 + 邮箱 + 昵称 + 密码）
const handleRegister = async () => {
  regLoading.value = true

  try {
    // 1. 先验证验证码
    const verifyRes = await verifyEmailCode({
      email: regEmail.value,
      code: regCode.value
    })
    
    verifyToken.value = verifyRes.verifyToken

    // 2. 注册并登录
    const res = await loginEmail({
      email: regEmail.value,
      verifyToken: verifyToken.value,
      nickname: regNickname.value.trim(),
      password: regPassword.value
    })

    authStore.setAuth({
      token: res.token,
      userInfo: res.userInfo,
      loginType: 'email'
    })

    showSuccessToast('注册成功')

    const redirect = route.query.redirect || '/'
    router.replace(redirect)
  } catch (error) {
    showFailToast(error.message || '注册失败')
  } finally {
    regLoading.value = false
  }
}

// 微信登录（预留）
const wechatLogin = () => {
  showToast('微信登录功能即将上线')
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40px 24px;
}

.login-header {
  text-align: center;
  color: white;
  margin-bottom: 32px;
}

.login-header h1 {
  font-size: 32px;
  margin-bottom: 8px;
}

.login-header p {
  font-size: 14px;
  opacity: 0.9;
}

.login-form {
  background: white;
  border-radius: 16px;
  padding: 16px 24px 24px;
  margin-bottom: 24px;
}

/* Vant Tabs 样式调整 */
::deep(.van-tabs__nav) {
  background: transparent;
}

::deep(.van-tab--active) {
  color: #1989fa;
  font-weight: 600;
}

::deep(.van-tabs__line) {
  background: #1989fa;
}

::deep(.van-tab__panel) {
  padding-top: 16px;
}

.submit-btn {
  margin-top: 24px;
}

.mode-switch {
  text-align: center;
  margin-top: 16px;
  font-size: 13px;
  color: #1989fa;
  cursor: pointer;
}

.mode-switch:hover {
  text-decoration: underline;
}

.countdown-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 96px;
  height: 32px;
  padding: 0 12px;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  user-select: none;
}

.countdown-active {
  background-color: #1989fa;
  color: #fff;
}

.countdown-active:hover {
  background-color: #1976d2;
}

.countdown-disabled {
  background-color: #ebedf0;
  color: #c8c9cc;
  cursor: not-allowed;
}

.countdown-loading {
  background-color: #ebedf0;
  color: #c8c9cc;
}

.login-tips {
  text-align: center;
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
  line-height: 1.8;
}

.wechat-login {
  margin-top: 24px;
}
</style>
