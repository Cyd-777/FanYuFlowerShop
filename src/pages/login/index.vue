<template>
  <view v-if="pageReady" class="login-page">
    <AppNavBar />
    <view class="logo">{{ logoEmoji }}</view>
    <view class="title">{{ shopStore.shopName }}</view>
    <view class="desc">{{ descText }}</view>

    <view class="consent-block">
      <view class="consent-row" @tap="toggleLegal">
        <view class="consent-check" :class="{ checked: agreedLegal }">
          <text v-if="agreedLegal" class="consent-check__mark">{{ checkMark }}</text>
        </view>
        <view class="consent-text">
          <text>{{ legalPrefix }}</text>
          <text class="consent-link" @tap.stop="openLegal('userAgreement')">{{ userAgreementLabel }}</text>
          <text>{{ legalAnd }}</text>
          <text class="consent-link" @tap.stop="openLegal('privacyPolicy')">{{ privacyLabel }}</text>
        </view>
      </view>

      <view class="consent-row" @tap="agreedAvatar = !agreedAvatar">
        <view class="consent-check" :class="{ checked: agreedAvatar }">
          <text v-if="agreedAvatar" class="consent-check__mark">{{ checkMark }}</text>
        </view>
        <text class="consent-text">{{ avatarNoticeText }}</text>
      </view>

      <view class="consent-row" @tap="agreedNick = !agreedNick">
        <view class="consent-check" :class="{ checked: agreedNick }">
          <text v-if="agreedNick" class="consent-check__mark">{{ checkMark }}</text>
        </view>
        <text class="consent-text">{{ nickNoticeText }}</text>
      </view>
    </view>

    <view class="subscribe-hint">{{ subscribeHintText }}</view>

    <view class="login-panel">
      <button
        class="login-btn wechat"
        :disabled="!canLogin || loading || subscribePrefetching"
        @tap="handleWechatLogin"
      >
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
          <button
            class="login-btn phone"
            :disabled="!canLogin || loading || subscribePrefetching"
            @tap="handlePhoneLogin"
          >
            {{ phoneLoginBtnText }}
          </button>
        </view>

        <view v-if="devCodeHint" class="dev-hint">开发验证码：{{ devCodeHint }}</view>
      </template>
    </view>

    <view class="tip" v-if="errorMsg">{{ errorMsg }}</view>

    <LoginLegalSheet :visible="legalSheetVisible" :kind="legalSheetKind" @close="legalSheetVisible = false" />

    <LoginProfileSheet
      :visible="profileSheetVisible"
      :initial-nick-name="pendingProfile?.nickName"
      :initial-avatar-url="pendingProfile?.avatarUrl"
      :saving="profileSaving"
      @save="onProfileSave"
      @skip="onProfileSkip"
      @notify="onProfileNotify"
    />
  </view>
</template>

<script setup lang="ts">
import { showToast } from '@/utils/feedback'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { useShopStore } from '@/stores/shop'
import { ENABLE_PHONE_LOGIN } from '@/config/login'
import type { LegalDocKind } from '@/config/legal'
import { navigateToHome, hasToken, getCachedRole, sendPhoneLoginCode } from '@/modules/auth'
import { STORAGE_KEYS } from '@/utils/constants'
import { redirectTo } from '@/utils/router'
import { parsePendingStaffInvite } from '@/modules/staff'
import {
  prefetchSubscribeTmplIds,
  recordBizNotifySubscribe,
  requestSubscribeOnLoginTap,
  resolveSubscribeTmplIds,
} from '@/modules/notify'
import {
  hasAcceptedCurrentAgreement,
  recordAgreementAccepted,
  markProfileGuideDone,
  shouldShowProfileGuide,
} from '@/utils/loginConsent'
import { saveUserProfile } from '@/modules/userProfile'
import type { UserAccount } from '@/types/account'

const logoEmoji = '🌷'
const descText = '每一束花，都是一次心动'
const subscribeHintText = '登录时将请求开启订单与配送微信通知，便于及时收花与商家履约'
const orDividerText = '或'
const checkMark = '✓'
const legalPrefix = '我已阅读并同意'
const userAgreementLabel = '《用户服务协议》'
const legalAnd = '与'
const privacyLabel = '《隐私政策》'
const avatarNoticeText = '我知晓登录后将通过「选择头像」提供头像，用于个人资料展示'
const nickNoticeText = '我知晓登录后将通过「填写昵称」提供昵称，用于订单与客服联系'
const consentRequiredText = '请先勾选全部告知项'

const pageReady = ref(false)

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

const agreedLegal = ref(false)
const agreedAvatar = ref(false)
const agreedNick = ref(false)

const legalSheetVisible = ref(false)
const legalSheetKind = ref<LegalDocKind | ''>('')

const profileSheetVisible = ref(false)
const profileSaving = ref(false)
const pendingProfile = ref<UserAccount | null>(null)
const pendingRole = ref<ReturnType<typeof getCachedRole>>(null)

const canLogin = computed(() => agreedLegal.value && agreedAvatar.value && agreedNick.value)

const wechatLoginBtnText = computed(() => {
  if (subscribePrefetching.value) return '准备中...'
  if (loading.value && mode.value === 'wechat') return '登录中...'
  if (!canLogin.value) return '请先勾选上方告知项'
  return '微信一键登录'
})

const phoneLoginBtnText = computed(() => {
  if (subscribePrefetching.value) return '准备中...'
  if (loading.value && mode.value === 'phone') return '登录中...'
  if (!canLogin.value) return '请先勾选上方告知项'
  return '手机号登录'
})

const userStore = useUserStore()
const shopStore = useShopStore()

let countdownTimer: ReturnType<typeof setInterval> | null = null

function toggleLegal() {
  agreedLegal.value = !agreedLegal.value
}

function openLegal(kind: LegalDocKind) {
  legalSheetKind.value = kind
  legalSheetVisible.value = true
}

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

function maybeShowProfileGuide(session: { userId: string; role: ReturnType<typeof getCachedRole>; profile: UserAccount }) {
  if (!shouldShowProfileGuide(session.userId, session.profile)) {
    redirectAfterLogin(session.role)
    return
  }
  pendingProfile.value = session.profile
  pendingRole.value = session.role
  profileSheetVisible.value = true
}

onMounted(() => {
  if (hasAcceptedCurrentAgreement()) {
    agreedLegal.value = true
  }
  void shopStore.hydrate()
  void initLoginPage()
})

async function initLoginPage() {
  if (hasToken()) {
    redirectAfterLogin(getCachedRole())
    return
  }
  pageReady.value = true
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

function ensureConsentChecked(): boolean {
  if (canLogin.value) return true
  showToast({ title: consentRequiredText, icon: 'none' })
  return false
}

/** 登录点击：同步弹订阅窗 → 登录 → 记录授权 */
function startLoginWithSubscribe(
  modeValue: 'wechat' | 'phone',
  loginFn: () => Promise<{ userId: string; role: ReturnType<typeof getCachedRole>; profile: UserAccount }>,
) {
  if (!ensureConsentChecked()) return
  if (loading.value || subscribePrefetching.value) return
  mode.value = modeValue
  errorMsg.value = ''

  const tmplIds = resolveSubscribeTmplIds()
  if (!tmplIds.length) {
    console.warn('[login] no subscribe tmpl ids; login without subscribe prompt')
    void runLoginAfterSubscribe(loginFn, [])
    return
  }

  void requestSubscribeOnLoginTap(tmplIds).then((accepted) => {
    void runLoginAfterSubscribe(loginFn, accepted)
  })
}

async function runLoginAfterSubscribe(
  loginFn: () => Promise<{ userId: string; role: ReturnType<typeof getCachedRole>; profile: UserAccount }>,
  acceptedTmplIds: string[],
) {
  loading.value = true
  errorMsg.value = ''
  try {
    const session = await loginFn()
    recordAgreementAccepted()
    if (acceptedTmplIds.length) {
      await recordBizNotifySubscribe(acceptedTmplIds).catch((err) => {
        console.warn('[login] record subscribe failed:', err)
      })
    }
    maybeShowProfileGuide(session)
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
  if (!ensureConsentChecked()) return
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

function finishProfileGuide(userId: string, options?: { skipped?: boolean }) {
  markProfileGuideDone(userId, options)
  profileSheetVisible.value = false
  pendingProfile.value = null
  const role = pendingRole.value
  pendingRole.value = null
  redirectAfterLogin(role)
}

async function onProfileSave(payload: { nickName: string; avatarUrl: string }) {
  const userId = userStore.userId
  if (!userId || profileSaving.value) return

  profileSaving.value = true
  try {
    const profile = await saveUserProfile(payload)
    userStore.$patch({ profile })
    wx.setStorageSync(STORAGE_KEYS.UserInfo, profile)
    finishProfileGuide(userId)
  } catch (err) {
    showToast({
      title: err instanceof Error ? err.message : '保存失败',
      icon: 'none',
    })
  } finally {
    profileSaving.value = false
  }
}

function onProfileSkip() {
  const userId = userStore.userId
  if (!userId) return
  finishProfileGuide(userId, { skipped: true })
}

function onProfileNotify() {
  const tmplIds = resolveSubscribeTmplIds()
  if (!tmplIds.length) {
    showToast({ title: '暂无可订阅模板', icon: 'none' })
    return
  }
  void requestSubscribeOnLoginTap(tmplIds).then((accepted) => {
    if (!accepted.length) return
    void recordBizNotifySubscribe(accepted).catch((err) => {
      console.warn('[login] profile notify record failed:', err)
    })
  })
}
</script>

<style lang="less">
@import '@/styles/tokens.less';

.login-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 180rpx 48rpx 48rpx;
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
.consent-block {
  width: 100%;
  margin-top: 40rpx;
  padding: 24rpx 20rpx;
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.82);
  border-radius: 20rpx;
}
.consent-row {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  &:not(:first-child) {
    margin-top: 20rpx;
  }
}
.consent-check {
  flex-shrink: 0;
  width: 36rpx;
  height: 36rpx;
  margin-top: 4rpx;
  border: 2rpx solid rgba(0, 0, 0, 0.2);
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  &.checked {
    border-color: @color-primary;
    background: @color-primary;
  }
}
.consent-check__mark {
  font-size: 22rpx;
  color: #fff;
  line-height: 1;
}
.consent-text {
  flex: 1;
  font-size: 24rpx;
  line-height: 1.6;
  color: @color-text-secondary;
}
.consent-link {
  color: @color-primary;
}
.subscribe-hint {
  margin-top: 20rpx;
  padding: 16rpx 20rpx;
  max-width: 100%;
  box-sizing: border-box;
  font-size: 22rpx;
  line-height: 1.5;
  color: @color-text-tertiary;
  text-align: center;
}
.login-panel {
  width: 100%;
  margin-top: 32rpx;
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
    background: @color-green-mid;
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
  color: @color-warning;
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
