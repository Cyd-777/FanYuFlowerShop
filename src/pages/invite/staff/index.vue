<template>
  <view class="page-staff-invite">
    <AppNavBar />
    <view v-if="loading" class="state-box">{{ uiText_1ab91d }}</view>

    <view v-else-if="errorMsg" class="state-box error">
      <view class="state-icon">⚠️</view>
      <view class="state-title">{{ errorMsg }}</view>
      <nut-button block class="action-btn" @click="goHome">返回首页</nut-button>
    </view>

    <view v-else-if="accepted" class="state-box success">
      <view class="state-icon">✅</view>
      <view class="state-title">{{ uiText_39d6a3 }}</view>
      <view class="state-desc">身份：{{ accepted.roleLabel }} · {{ accepted.name }}</view>
      <nut-button type="primary" block class="action-btn" @click="goMerchant">进入商家工作台</nut-button>
      <nut-button plain block class="action-btn secondary" @click="goHome">返回首页</nut-button>
    </view>

    <view v-else-if="invite" class="invite-card">
      <view class="invite-icon">🏪</view>
      <view class="invite-title">{{ uiText_fe62fa }}</view>
      <view class="invite-desc">{{ uiText_b627cb }}</view>

      <view class="info-block">
        <view class="info-row">
          <text class="label">{{ uiText_5eceae }}</text>
          <text class="value">{{ invite.name }}</text>
        </view>
        <view class="info-row">
          <text class="label">{{ roleLabelText }}</text>
          <text class="value">{{ invite.roleLabel }}</text>
        </view>
        <view class="info-row">
          <text class="label">{{ uiText_6460f4 }}</text>
          <text class="value">{{ expiresText }}</text>
        </view>
      </view>

      <view v-if="invite.status !== 'pending'" class="warn-text">
        {{ statusHint }}
      </view>

      <template v-else>
        <nut-button
          v-if="!isLoggedIn"
          type="primary"
          block
          class="action-btn"
          @click="goLogin"
        >
          登录后接受邀请
        </nut-button>
        <nut-button
          v-else
          type="primary"
          block
          class="action-btn"
          :loading="accepting"
          @click="handleAccept"
        >
          接受邀请
        </nut-button>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import { showToast } from '@/utils/feedback'
import { computed, ref } from 'vue'
import { useDidShow, useLoad, useShareAppMessage } from '@tarojs/taro'
import { navigateTo, redirectTo } from '@/utils/router'
import {
  checkAccess,
  hasToken,
} from '@/modules/auth'
import { acceptStaffInvite, previewStaffInvite, type StaffInvitePreview } from '@/modules/staff'
import { STORAGE_KEYS } from '@/utils/constants'
import { useUserStore } from '@/stores/user'

const roleLabelText = '身份'
const uiText_1ab91d = '加载邀请信息…'
const uiText_39d6a3 = '已成为工作人员'
const uiText_5eceae = '预设姓名'
const uiText_6460f4 = '有效期至'
const uiText_b627cb = '店长邀请你加入梵宇花店商家后台'
const uiText_fe62fa = '商家团队邀请'

const userStore = useUserStore()

const token = ref('')
const invite = ref<StaffInvitePreview | null>(null)
const loading = ref(true)
const accepting = ref(false)
const accepted = ref<{ name: string; roleLabel: string } | null>(null)
const errorMsg = ref('')
const isLoggedIn = ref(hasToken())

const expiresText = computed(() => {
  const ts = invite.value?.expiresAt || 0
  if (!ts) return '--'
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
})

const statusHint = computed(() => {
  if (invite.value?.status === 'used') return '该邀请已被使用'
  if (invite.value?.status === 'expired') return '邀请已过期，请联系店长重新发送'
  return '邀请无效'
})

useLoad((options) => {
  token.value = options?.token ? decodeURIComponent(String(options.token)) : ''
})

useDidShow(() => {
  isLoggedIn.value = hasToken()
  void loadInvite()
})

useShareAppMessage(() => ({
  title: '梵宇花店商家团队邀请',
  path: token.value ? `/pages/invite/staff/index?token=${token.value}` : '/pages/home/index',
}))

async function loadInvite() {
  if (!token.value) {
    loading.value = false
    errorMsg.value = '邀请链接无效'
    return
  }

  loading.value = true
  errorMsg.value = ''
  try {
    invite.value = await previewStaffInvite(token.value)
    if (invite.value.status !== 'pending') {
      invite.value = invite.value
    }
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : '邀请无效'
    invite.value = null
  } finally {
    loading.value = false
  }
}

function goLogin() {
  wx.setStorageSync(STORAGE_KEYS.PendingStaffInvite, token.value)
  void navigateTo({ url: '/pages/login/index' })
}

async function handleAccept() {
  if (!token.value || accepting.value || invite.value?.status !== 'pending') return

  if (!hasToken()) {
    goLogin()
    return
  }

  accepting.value = true
  try {
    const result = await acceptStaffInvite(token.value)
    const session = await checkAccess()
    userStore.syncSession(session)
    accepted.value = { name: result.name, roleLabel: result.roleLabel }
    wx.removeStorageSync(STORAGE_KEYS.PendingStaffInvite)
  } catch (err) {
    showToast({
      title: err instanceof Error ? err.message : '接受失败',
      icon: 'none',
    })
  } finally {
    accepting.value = false
  }
}

function goMerchant() {
  void redirectTo({ url: '/pagesMerchant/dashboard/index' })
}

function goHome() {
  void redirectTo({ url: '/pages/home/index' })
}
</script>

<style lang="less">
.page-staff-invite {
  min-height: 100vh;
  padding: 32rpx;
  background: @color-bg-page;
  box-sizing: border-box;
}
.state-box,
.invite-card {
  margin-top: 48rpx;
  padding: 48rpx 40rpx;
  background: #fff;
  border-radius: 24rpx;
  text-align: center;
}
.state-icon {
  font-size: 80rpx;
  line-height: 1;
}
.state-title {
  margin-top: 24rpx;
  font-size: 34rpx;
  font-weight: 600;
  color: #333;
}
.state-desc {
  margin-top: 12rpx;
  font-size: 26rpx;
  color: #999;
}
.invite-icon {
  font-size: 88rpx;
}
.invite-title {
  margin-top: 16rpx;
  font-size: 36rpx;
  font-weight: 600;
}
.invite-desc {
  margin-top: 12rpx;
  font-size: 26rpx;
  color: #999;
}
.info-block {
  margin-top: 32rpx;
  padding: 24rpx;
  text-align: left;
  background: @color-bg-input;
  border-radius: 16rpx;
}
.info-row {
  display: flex;
  justify-content: space-between;
  padding: 12rpx 0;
  font-size: 28rpx;
  .label {
    color: #999;
  }
  .value {
    color: #333;
    font-weight: 500;
  }
}
.warn-text {
  margin-top: 32rpx;
  font-size: 26rpx;
  color: @color-warning;
}
.action-btn {
  margin-top: 24rpx;
  border-radius: 48rpx;
  height: 88rpx;
  font-size: 30rpx;
  &.secondary {
    margin-top: 16rpx;
  }
}
</style>
