<template>
  <view class="page-invite-join">
    <AppNavBar />
    <view v-if="accepted" class="state-box success">
      <view class="state-icon">✅</view>
      <view class="state-title">{{ uiText_39d6a3 }}</view>
      <view class="state-desc">身份：{{ accepted.roleLabel }} · {{ accepted.name }}</view>
      <nut-button type="primary" block class="action-btn" @click="goMerchant">进入商家工作台</nut-button>
      <nut-button plain block class="action-btn secondary" @click="goMine">返回我的</nut-button>
    </view>

    <view v-else class="join-card">
      <view class="join-icon">🔑</view>
      <view class="join-title">{{ uiText_9920d3 }}</view>
      <view class="join-desc">{{ uiText_05460d }}</view>

      <view class="code-input-wrap">
        <nut-input
          v-model="codeInput"
          placeholder="例如 A3K9P2"
          maxlength="8"
          :disabled="previewing || accepting"
          @blur="onCodeBlur"
        />
      </view>

      <nut-button
        type="primary"
        block
        class="action-btn"
        :loading="previewing"
        :disabled="!canSubmit"
        @click="handlePreview"
      >
        验证邀请码
      </nut-button>

      <view v-if="invite" class="info-block">
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

      <view v-if="invite && invite.status !== 'pending'" class="warn-text">
        {{ statusHint }}
      </view>

      <template v-if="invite && invite.status === 'pending'">
        <nut-button
          v-if="!isLoggedIn"
          type="primary"
          block
          class="action-btn"
          @click="goLogin"
        >
          登录后加入团队
        </nut-button>
        <nut-button
          v-else
          type="primary"
          block
          class="action-btn"
          :loading="accepting"
          @click="handleAccept"
        >
          确认加入
        </nut-button>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import { showToast } from '@/utils/feedback'
import { computed, ref } from 'vue'
import { useDidShow, useLoad } from '@tarojs/taro'
import { navigateTo, redirectTo } from '@/utils/router'
import { checkAccess, hasToken } from '@/modules/auth'
import {
  acceptStaffInviteByCode,
  buildPendingStaffInviteCode,
  isStaffInviteCode,
  normalizeStaffInviteCode,
  previewStaffInviteByCode,
  type StaffInvitePreview,
} from '@/modules/staff'
import { STORAGE_KEYS } from '@/utils/constants'
import { useUserStore } from '@/stores/user'

const roleLabelText = '身份'
const uiText_05460d = '输入店长发来的 6 位邀请码，验证后自行加入商家团队'
const uiText_39d6a3 = '已成为工作人员'
const uiText_5eceae = '预设姓名'
const uiText_6460f4 = '有效期至'
const uiText_9920d3 = '输入邀请码'

const userStore = useUserStore()

const codeInput = ref('')
const invite = ref<StaffInvitePreview | null>(null)
const previewing = ref(false)
const accepting = ref(false)
const accepted = ref<{ name: string; roleLabel: string } | null>(null)
const isLoggedIn = ref(hasToken())

const normalizedCode = computed(() => normalizeStaffInviteCode(codeInput.value))
const canSubmit = computed(() => isStaffInviteCode(normalizedCode.value))

const expiresText = computed(() => {
  const ts = invite.value?.expiresAt || 0
  if (!ts) return '--'
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
})

const statusHint = computed(() => {
  if (invite.value?.status === 'used') return '该邀请码已被使用'
  if (invite.value?.status === 'expired') return '邀请码已过期，请联系店长重新生成'
  return '邀请码无效'
})

useLoad((options) => {
  const preset = options?.code ? decodeURIComponent(String(options.code)) : ''
  if (preset) {
    codeInput.value = normalizeStaffInviteCode(preset)
    void handlePreview()
  }
})

useDidShow(() => {
  isLoggedIn.value = hasToken()
})

function onCodeBlur() {
  codeInput.value = normalizedCode.value
}

async function handlePreview() {
  if (!canSubmit.value || previewing.value) return
  previewing.value = true
  invite.value = null
  try {
    invite.value = await previewStaffInviteByCode(normalizedCode.value)
  } catch (err) {
    showToast({
      title: err instanceof Error ? err.message : '邀请码无效',
      icon: 'none',
    })
  } finally {
    previewing.value = false
  }
}

function goLogin() {
  wx.setStorageSync(STORAGE_KEYS.PendingStaffInvite, buildPendingStaffInviteCode(normalizedCode.value))
  void navigateTo({ url: '/pages/login/index' })
}

async function handleAccept() {
  if (!canSubmit.value || accepting.value || invite.value?.status !== 'pending') return

  if (!hasToken()) {
    goLogin()
    return
  }

  accepting.value = true
  try {
    const result = await acceptStaffInviteByCode(normalizedCode.value)
    const session = await checkAccess()
    userStore.syncSession(session)
    accepted.value = { name: result.name, roleLabel: result.roleLabel }
    wx.removeStorageSync(STORAGE_KEYS.PendingStaffInvite)
  } catch (err) {
    showToast({
      title: err instanceof Error ? err.message : '加入失败',
      icon: 'none',
    })
  } finally {
    accepting.value = false
  }
}

function goMerchant() {
  void redirectTo({ url: '/pagesMerchant/dashboard/index' })
}

function goMine() {
  void redirectTo({ url: '/pages/mine/index' })
}
</script>

<style lang="less">
@import '@/styles/tokens.less';
.page-invite-join {
  min-height: 100vh;
  padding: 32rpx;
  background: @color-bg-page;
  box-sizing: border-box;
}
.state-box,
.join-card {
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
.join-icon {
  font-size: 88rpx;
}
.join-title {
  margin-top: 16rpx;
  font-size: 36rpx;
  font-weight: 600;
}
.join-desc {
  margin-top: 12rpx;
  font-size: 26rpx;
  color: #999;
  line-height: 1.5;
}
.code-input-wrap {
  margin-top: 32rpx;
  text-align: left;
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
  margin-top: 24rpx;
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
