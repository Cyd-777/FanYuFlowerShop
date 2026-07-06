<template>
  <view class="login-page">
    <AppNavBar />
    <view class="logo">{{ logoEmoji }}</view>
    <view class="title">{{ shopStore.shopName }}</view>
    <view class="desc">{{ descText }}</view>
    <view class="subscribe-hint">{{ subscribeHintText }}</view>

    <view class="login-panel">
      <button class="login-btn wechat" :disabled="loading || subscribePrefetching" @tap="handleWechatLogin">
        {{ wechatLoginBtnText }}
      </button>

      <template v-if="enablePhoneLogin">
        <view class="divider">
          <view class="divider-line" />
          <text class="divider-text">{{ orDividerText }}</text>
          <view class="divider-line" />
        </view>

        <view class="phone-form">
          <input
            class="field-input"
            type="number"
            maxlength="11"
            placeholder="手机号"
            :value="phone"
            :disabled="loading"
            @input="onPhoneInput"
          />
          <view class="code-row">
            <input
              class="field-input code-input"
              type="number"
              maxlength="6"
              placeholder="验证码"
              :value="smsCode"
              :disabled="loading"
              @input="onCodeInput"
            />
            <button
              class="code-btn"
              :disabled="loading || sendingCode || countdown > 0"
              @tap="handleSendCode"
            >
              {{ countdown > 0 ? `${countdown}s` : sendingCode ? '发送中' : '获取验证码' }}
            </button>
          </view>
          <button class="login-btn phone" :disabled="loading || subscribePrefetching" @tap="handlePhoneLogin">
            {{ phoneLoginBtnText }}
          </button>
        </view>

        <view v-if="devCodeHint" class="dev-hint">开发验证码：{{ devCodeHint }}</view>
      </template>
    </view>

    <view class="tip" v-if="errorMsg">{{ errorMsg }}</view>
  </view>
</template>

<script setup lang="ts">
import { showToast } from '@/utils/feedback'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { useShopStore } from '@/stores/shop'
import { ENABLE_PHONE_LOGIN } from '@/config/login'
import { navigateToHome, hasToken, getCachedRole, sendPhoneLoginCode } from '@/services/auth'
import { STORAGE_KEYS } from '@/utils/constants'
import { redirectTo } from '@/utils/router'
import { parsePendingStaffInvite } from '@/modules/staff'
import {
  prefetchSubscribeTmplIds,
  recordBizNotifySubscribe,
  requestSubscribeOnLoginTap,
  resolveSubscribeTmplIds,
} from '@/modules/notify'

const orDividerText = '或'

const logoEmoji = '🌷'
const descText = '每一束花，都是一次心动'
const subscribeHintText = '登录时将请求开启订单与配送微信通知，便于及时收花与商家履约'

const enablePhoneLogin = ENABLE_PHONE_LOGIN

const loading = ref(false)
const sendingCode = ref(false)
const countdown = ref(0)
const errorMsg = ref('')
const devCodeHint = ref('')
const phone = ref('')
const smsCode = ref('')
const mode = ref<'wechat' | 'phone' | ''>('')
const subscribePrefetching = ref(resolveSubscribeTmplIds().length === 0)

const wechatLoginBtnText = computed(() => {
  if (subscribePrefetching.value) return '准备中...'
  if (loading.value && mode.value === 'wechat') return '登录中...'
  return '微信一键登录'
})

const phoneLoginBtnText = computed(() => {
  if (subscribePrefetching.value) return '准备中...'
  if (loading.value && mode.value === 'phone') return '登录中...'
  return '手机号登录'
})

const userStore = useUserStore()
const shopStore = useShopStore()

let countdownTimer: ReturnType<typeof setInterval> | null = null

function redirectAfterLogin(role: ReturnType<typeof getCachedRole>) {
  const pending = parsePendingStaffInvite(wx.getStorageSync(STORAGE_KEYS.PendingStaffInvite))
  if (pending) {
    const url =
      pending.type === 'code'
        ? `/pages/invite/join/index?code=${encodeURIComponent(pending.value)}`
        : `/pages/invite/staff/index?token=${encodeURIComponent(pending.value)}`
    void redirectTo({ url })
    return
  }
  if (role) navigateToHome(role)
}

onMounted(() => {
  void shopStore.hydrate()
  void initLoginPage()
})

async function initLoginPage() {
  if (hasToken()) {
    const role = getCachedRole()
    redirectAfterLogin(role)
    return
  }
  if (resolveSubscribeTmplIds().length) {
    subscribePrefetching.value = false
    return
  }
  subscribePrefetching.value = true
  try {
    await prefetchSubscribeTmplIds()
  } catch (err) {
    console.error('[login] subscribe prefetch failed:', err)
  } finally {
    subscribePrefetching.value = false
  }
}

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})

function onPhoneInput(e: { detail?: { value?: string } }) {
  phone.value = String(e.detail?.value || '').replace(/\D/g, '').slice(0, 11)
}

function onCodeInput(e: { detail?: { value?: string } }) {
  smsCode.value = String(e.detail?.value || '').replace(/\D/g, '').slice(0, 6)
}

function startCountdown(seconds = 60) {
  countdown.value = seconds
  if (countdownTimer) clearInterval(countdownTimer)
  countdownTimer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0 && countdownTimer) {
      clearInterval(countdownTimer)
      countdownTimer = null
    }
  }, 1000)
}

/** 登录点击：同步弹订阅窗 → 登录 → 记录授权 */
function startLoginWithSubscribe(
  modeValue: 'wechat' | 'phone',
  loginFn: () => Promise<{ role: ReturnType<typeof getCachedRole> }>,
) {
  if (loading.value || subscribePrefetching.value) return
  mode.value = modeValue
  errorMsg.value = ''

  const tmplIds = resolveSubscribeTmplIds()
  if (!tmplIds.length) {
    console.warn('[login] no subscribe tmpl ids; login without subscribe prompt')
    void runLoginAfterSubscribe(loginFn, [])
    return
  }

  // 须在 tap 回调栈内同步发起；Promise 在弹窗关闭后继续
  void requestSubscribeOnLoginTap(tmplIds).then((accepted) => {
    void runLoginAfterSubscribe(loginFn, accepted)
  })
}

async function runLoginAfterSubscribe(
  loginFn: () => Promise<{ role: ReturnType<typeof getCachedRole> }>,
  acceptedTmplIds: string[],
) {
  loading.value = true
  errorMsg.value = ''
  try {
    const { role } = await loginFn()
    if (acceptedTmplIds.length) {
      await recordBizNotifySubscribe(acceptedTmplIds).catch((err) => {
        console.warn('[login] record subscribe failed:', err)
      })
    }
    redirectAfterLogin(role)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '登录失败'
    errorMsg.value = msg
    wx.showModal({ title: '登录失败', content: msg, showCancel: false })
  } finally {
    loading.value = false
    mode.value = ''
  }
}

function handleWechatLogin() {
  startLoginWithSubscribe('wechat', () => userStore.doLoginWechat())
}

async function handleSendCode() {
  if (!enablePhoneLogin || loading.value || sendingCode.value || countdown.value > 0) return
  if (!/^1\d{10}$/.test(phone.value)) {
    showToast({ title: '请输入正确手机号', icon: 'none' })
    return
  }

  sendingCode.value = true
  errorMsg.value = ''
  devCodeHint.value = ''
  try {
    const { devCode } = await sendPhoneLoginCode(phone.value)
    if (devCode) devCodeHint.value = devCode
    showToast({ title: '验证码已发送', icon: 'success' })
    startCountdown()
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '发送失败'
    errorMsg.value = msg
    showToast({ title: msg, icon: 'none' })
  } finally {
    sendingCode.value = false
  }
}

function handlePhoneLogin() {
  if (!enablePhoneLogin || loading.value || subscribePrefetching.value) return
  if (!/^1\d{10}$/.test(phone.value)) {
    showToast({ title: '请输入正确手机号', icon: 'none' })
    return
  }
  if (!smsCode.value.trim()) {
    showToast({ title: '请输入验证码', icon: 'none' })
    return
  }

  startLoginWithSubscribe('phone', () =>
    userStore.doLoginPhone(phone.value, smsCode.value.trim()),
  )
}
</script>

<style lang="less">
@import '@/styles/tokens.less';

.login-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 180rpx 64rpx 48rpx;
  min-height: 100vh;
  box-sizing: border-box;
  background: linear-gradient(180deg, @color-primary-light 0%, @color-bg-card 40%);
}
.logo {
  width: 160rpx;
  height: 160rpx;
  border-radius: 32rpx;
  font-size: 100rpx;
  line-height: 160rpx;
  text-align: center;
  background: @color-bg-card;
}
.title {
  margin-top: 32rpx;
  font-size: 48rpx;
  font-weight: 600;
  color: @color-text-primary;
}
.desc {
  margin-top: 16rpx;
  font-size: 28rpx;
  color: @color-text-tertiary;
}
.subscribe-hint {
  margin-top: 24rpx;
  padding: 20rpx 24rpx;
  max-width: 100%;
  box-sizing: border-box;
  font-size: 24rpx;
  line-height: 1.5;
  color: @color-text-secondary;
  text-align: center;
  background: rgba(255, 255, 255, 0.72);
  border-radius: 16rpx;
}
.login-panel {
  width: 100%;
  margin-top: 64rpx;
}
.login-btn {
  width: 100%;
  height: 96rpx;
  line-height: 96rpx;
  border-radius: @radius-pill;
  font-size: 30rpx;
  border: none;
  &::after {
    border: none;
  }
  &[disabled] {
    opacity: 0.7;
  }
  &.wechat {
    color: #fff;
    background: #07c160;
  }
  &.phone {
    margin-top: 24rpx;
    color: #fff;
    background: @color-primary;
  }
}
.divider {
  display: flex;
  align-items: center;
  margin: 40rpx 0 32rpx;
}
.divider-line {
  flex: 1;
  height: 2rpx;
  background: rgba(0, 0, 0, 0.08);
}
.divider-text {
  margin: 0 24rpx;
  font-size: 24rpx;
  color: @color-text-tertiary;
}
.phone-form {
  width: 100%;
}
.field-input {
  width: 100%;
  height: 88rpx;
  margin-bottom: 20rpx;
  padding: 0 24rpx;
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16rpx;
  font-size: 28rpx;
}
.code-row {
  display: flex;
  gap: 16rpx;
  margin-bottom: 8rpx;
}
.code-input {
  flex: 1;
  margin-bottom: 0;
}
.code-btn {
  flex-shrink: 0;
  width: 220rpx;
  height: 88rpx;
  line-height: 88rpx;
  padding: 0;
  font-size: 24rpx;
  color: @color-primary;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16rpx;
  border: none;
  &::after {
    border: none;
  }
  &[disabled] {
    opacity: 0.6;
    color: #999;
  }
}
.dev-hint {
  margin-top: 24rpx;
  font-size: 22rpx;
  color: #e65100;
  text-align: center;
}
.tip {
  margin-top: 16rpx;
  font-size: 24rpx;
  color: @color-primary;
  text-align: center;
  line-height: 1.5;
}
</style>
