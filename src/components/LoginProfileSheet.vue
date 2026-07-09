<template>
  <view v-if="visible" class="login-profile-mask">
    <view class="login-profile-sheet" @tap.stop="noop">
      <view class="login-profile-sheet__title">{{ titleText }}</view>
      <view class="login-profile-sheet__desc">{{ descText }}</view>

      <view class="login-profile-sheet__avatar-wrap">
        <button class="login-profile-sheet__avatar-btn" open-type="chooseAvatar" @chooseavatar="onChooseAvatar">
          <image
            v-if="avatarDisplay"
            class="login-profile-sheet__avatar-img"
            :src="avatarDisplay"
            mode="aspectFill"
          />
          <view v-else class="login-profile-sheet__avatar-placeholder">{{ avatarEmoji }}</view>
        </button>
        <text class="login-profile-sheet__avatar-tip">{{ avatarTipText }}</text>
      </view>

      <view class="login-profile-sheet__field">
        <text class="login-profile-sheet__label">{{ nickLabel }}</text>
        <input
          class="login-profile-sheet__input"
          type="nickname"
          :value="nickName"
          :placeholder="nickPlaceholder"
          maxlength="20"
          @input="onNickInput"
          @blur="onNickBlur"
        />
      </view>

      <view class="login-profile-sheet__actions">
        <button
          class="login-profile-sheet__btn login-profile-sheet__btn--primary"
          :disabled="saving"
          @tap="emitSave"
        >
          {{ saving ? savingText : saveText }}
        </button>
        <button class="login-profile-sheet__btn login-profile-sheet__btn--plain" @tap="emitSkip">
          {{ skipText }}
        </button>
        <button class="login-profile-sheet__btn login-profile-sheet__btn--ghost" @tap="emitNotify">
          {{ notifyText }}
        </button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { DEFAULT_PROFILE_NICKNAME } from '@/utils/loginConsent'

const titleText = '完善你的花店资料'
const descText = '选一张头像、起一个昵称，方便订单与客服联系你'
const avatarEmoji = '🌷'
const avatarTipText = '点击选择头像'
const nickLabel = '昵称'
const nickPlaceholder = '点击填写昵称'
const saveText = '保存并继续'
const savingText = '保存中...'
const skipText = '稍后再说'
const notifyText = '开启订单通知（可选）'

const props = defineProps<{
  visible: boolean
  initialNickName?: string
  initialAvatarUrl?: string
  saving?: boolean
}>()

const emit = defineEmits<{
  save: [payload: { nickName: string; avatarUrl: string }]
  skip: []
  notify: []
}>()

const nickName = ref(DEFAULT_PROFILE_NICKNAME)
const pendingAvatarUrl = ref('')
const avatarDisplay = ref('')

watch(
  () => [props.visible, props.initialNickName, props.initialAvatarUrl] as const,
  ([visible, nick, avatar]) => {
    if (!visible) return
    const nextNick = (nick || '').trim()
    nickName.value = nextNick && nextNick !== DEFAULT_PROFILE_NICKNAME ? nextNick : ''
    pendingAvatarUrl.value = avatar || ''
    avatarDisplay.value = avatar && /^(https?:\/\/|wxfile:|\/)/.test(avatar) ? avatar : ''
  },
  { immediate: true },
)

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
  nickName.value = String(e.detail?.value || nickName.value).trim()
}

function emitSave() {
  const trimmed = nickName.value.trim()
  if (!trimmed) {
    wx.showToast({ title: '请填写昵称', icon: 'none' })
    return
  }
  emit('save', {
    nickName: trimmed,
    avatarUrl: pendingAvatarUrl.value,
  })
}

function emitSkip() {
  emit('skip')
}

function emitNotify() {
  emit('notify')
}

function noop() {}
</script>

<style lang="less">
@import '@/styles/tokens.less';

.login-profile-mask {
  position: fixed;
  inset: 0;
  z-index: 1100;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48rpx 32rpx;
  box-sizing: border-box;
}
.login-profile-sheet {
  width: 100%;
  max-width: 640rpx;
  padding: 40rpx 32rpx 32rpx;
  border-radius: 24rpx;
  background: #fff;
  box-sizing: border-box;
}
.login-profile-sheet__title {
  font-size: 34rpx;
  font-weight: 600;
  color: @color-text-primary;
  text-align: center;
}
.login-profile-sheet__desc {
  margin-top: 16rpx;
  font-size: 26rpx;
  line-height: 1.6;
  color: @color-text-tertiary;
  text-align: center;
}
.login-profile-sheet__avatar-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 36rpx;
}
.login-profile-sheet__avatar-btn {
  width: 144rpx;
  height: 144rpx;
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
.login-profile-sheet__avatar-img,
.login-profile-sheet__avatar-placeholder {
  width: 144rpx;
  height: 144rpx;
  border-radius: 50%;
  background: @color-bg-muted;
}
.login-profile-sheet__avatar-placeholder {
  font-size: 64rpx;
  line-height: 144rpx;
  text-align: center;
}
.login-profile-sheet__avatar-tip {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: @color-text-tertiary;
}
.login-profile-sheet__field {
  display: flex;
  align-items: center;
  margin-top: 32rpx;
  padding: 24rpx;
  border-radius: 16rpx;
  background: @color-bg-page;
}
.login-profile-sheet__label {
  width: 96rpx;
  flex-shrink: 0;
  font-size: 28rpx;
  color: @color-text-secondary;
}
.login-profile-sheet__input {
  flex: 1;
  font-size: 28rpx;
  color: @color-text-primary;
}
.login-profile-sheet__actions {
  margin-top: 36rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.login-profile-sheet__btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  font-size: 28rpx;
  border-radius: @radius-pill;
  border: none;
  &::after {
    border: none;
  }
  &--primary {
    color: #fff;
    background: @color-primary;
  }
  &--plain {
    color: @color-text-secondary;
    background: @color-bg-placeholder;
  }
  &--ghost {
    color: @color-primary;
    background: transparent;
    height: 72rpx;
    line-height: 72rpx;
  }
  &[disabled] {
    opacity: 0.6;
  }
}
</style>
