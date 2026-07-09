<template>
  <view class="page-profile-edit">
    <AppNavBar />
    <view class="avatar-section">
      <button class="avatar-picker" open-type="chooseAvatar" @chooseavatar="onChooseAvatar">
        <image
          v-if="avatarDisplay"
          class="avatar-img"
          :src="avatarDisplay"
          mode="aspectFill"
        />
        <view v-else class="avatar-placeholder">{{ avatarEmoji }}</view>
      </button>
      <view class="avatar-tip">{{ uiText_5d49fe }}</view>
    </view>

    <view class="form-card">
      <view class="form-row">
        <text class="form-label">{{ uiText_23eb0e }}</text>
        <input
          class="nickname-input"
          type="nickname"
          :value="nickName"
          placeholder="点击填写昵称"
          maxlength="20"
          @input="onNickInput"
          @blur="onNickBlur"
        />
      </view>
    </view>

    <view class="actions">
      <button
        class="save-btn"
        :disabled="saving || !dirty"
        @tap="saveProfile"
      >
        {{ saving ? '保存中...' : '保存' }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { showToast } from '@/utils/feedback'
import { computed, ref } from 'vue'
import { useDidShow } from '@tarojs/taro'
import { navigateBack, navigateTo } from '@/utils/router'
import { useUserStore } from '@/stores/user'
import { hasToken } from '@/modules/auth'
import {
  fetchUserProfile,
  saveUserProfile,
  resolveAvatarDisplayPath,
} from '@/modules/userProfile'
import { STORAGE_KEYS } from '@/utils/constants'

const uiText_23eb0e = '昵称'
const uiText_5d49fe = '点击头像更换'

const avatarEmoji = '🌷'
const defaultNickname = '花友'

const userStore = useUserStore()

const nickName = ref(defaultNickname)
const savedNickName = ref(defaultNickname)
const pendingAvatarUrl = ref('')
const savedAvatarUrl = ref('')
const avatarDisplay = ref('')
const saving = ref(false)

const dirty = computed(
  () =>
    nickName.value.trim() !== savedNickName.value.trim()
    || pendingAvatarUrl.value !== savedAvatarUrl.value,
)

useDidShow(() => {
  if (!hasToken()) {
    showToast({ title: '请先登录', icon: 'none' })
    setTimeout(() => navigateTo({ url: '/pages/login/index' }), 600)
    return
  }
  void loadProfile()
})

async function applyProfile(profile: { nickName?: string; avatarUrl?: string }) {
  const nextNick = profile.nickName?.trim() || defaultNickname
  nickName.value = nextNick
  savedNickName.value = nextNick

  const nextAvatar = profile.avatarUrl || ''
  pendingAvatarUrl.value = nextAvatar
  savedAvatarUrl.value = nextAvatar
  avatarDisplay.value = nextAvatar ? await resolveAvatarDisplayPath(nextAvatar) : ''
}

async function loadProfile() {
  const cached = userStore.profile || wx.getStorageSync(STORAGE_KEYS.UserInfo)
  if (cached && typeof cached === 'object') {
    await applyProfile(cached)
  }

  try {
    const profile = await fetchUserProfile()
    await applyProfile(profile)
    userStore.$patch({ profile })
    wx.setStorageSync(STORAGE_KEYS.UserInfo, profile)
  } catch (err) {
    console.warn('[profile/edit] fetch failed:', err)
  }
}

function onChooseAvatar(e: { detail?: { avatarUrl?: string } }) {
  const url = e.detail?.avatarUrl || ''
  if (!url) return
  pendingAvatarUrl.value = url
  avatarDisplay.value = url
}

function onNickInput(e: { detail?: { value?: string } }) {
  nickName.value = String(e.detail?.value || '')
}

function onNickBlur(e: { detail?: { value?: string } }) {
  nickName.value = String(e.detail?.value || nickName.value).trim() || defaultNickname
}

async function saveProfile() {
  if (saving.value) return

  const trimmedNick = nickName.value.trim()
  if (!trimmedNick) {
    showToast({ title: '请填写昵称', icon: 'none' })
    return
  }

  saving.value = true
  try {
    const profile = await saveUserProfile({
      nickName: trimmedNick,
      avatarUrl: pendingAvatarUrl.value || savedAvatarUrl.value,
    })
    await applyProfile(profile)
    userStore.$patch({ profile })
    showToast({ title: '已保存', icon: 'success' })
    setTimeout(() => navigateBack(), 400)
  } catch (err) {
    showToast({
      title: err instanceof Error ? err.message : '保存失败',
      icon: 'none',
    })
  } finally {
    saving.value = false
  }
}
</script>

<style lang="less">
@import '@/styles/tokens.less';

.page-profile-edit {
  min-height: 100vh;
  padding: 32rpx 24rpx 48rpx;
  box-sizing: border-box;
  background: @color-bg-page;
}
.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48rpx 0 32rpx;
}
.avatar-picker {
  width: 160rpx;
  height: 160rpx;
  padding: 0;
  margin: 0;
  border: none;
  border-radius: 50%;
  overflow: hidden;
  background: transparent;
  &::after {
    border: none;
  }
}
.avatar-img,
.avatar-placeholder {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  background: #fff;
}
.avatar-placeholder {
  font-size: 72rpx;
  line-height: 160rpx;
  text-align: center;
}
.avatar-tip {
  margin-top: 16rpx;
  font-size: 24rpx;
  color: @color-text-tertiary;
}
.form-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 8rpx 24rpx;
}
.form-row {
  display: flex;
  align-items: center;
  padding: 28rpx 0;
}
.form-label {
  width: 120rpx;
  flex-shrink: 0;
  font-size: 28rpx;
  color: @color-text-secondary;
}
.nickname-input {
  flex: 1;
  font-size: 28rpx;
  color: @color-text-primary;
}
.actions {
  margin-top: 48rpx;
  padding: 0 8rpx;
}
.save-btn {
  width: 100%;
  height: 96rpx;
  line-height: 96rpx;
  font-size: 30rpx;
  color: #fff;
  background: @color-primary;
  border-radius: @radius-pill;
  border: none;
  &::after {
    border: none;
  }
  &[disabled] {
    opacity: 0.5;
  }
}
</style>
