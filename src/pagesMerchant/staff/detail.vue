<template>
  <view class="page-staff-detail">
    <AppNavBar />
    <view v-if="loading" class="loading-tip">{{ loadingTipText }}</view>

    <template v-else-if="member">
      <view class="profile-card">
        <image
          v-if="avatarDisplay"
          class="profile-avatar"
          :src="avatarDisplay"
          mode="aspectFill"
        />
        <view v-else class="profile-avatar placeholder">👤</view>
        <view class="profile-meta">
          <view class="profile-name">{{ member.name }}</view>
          <view v-if="member.nickName" class="profile-nick">{{ member.nickName }}</view>
        </view>
      </view>

      <view class="form-card">
        <nut-form>
          <nut-form-item label="用户 ID">
            <view class="readonly-value">{{ member.userId }}</view>
          </nut-form-item>
          <nut-form-item label="姓名">
            <nut-input v-model="form.name" placeholder="工作人员姓名" />
          </nut-form-item>
          <nut-form-item label="身份">
            <view v-if="isOwner" class="readonly-value">
              <text class="role-tag owner">{{ roleLabel(member.role) }}</text>
            </view>
            <nut-radio-group v-else v-model="form.role" direction="horizontal">
              <nut-radio
                v-for="item in roleOptions"
                :key="item.value"
                :label="item.value"
              >
                {{ item.label }}
              </nut-radio>
            </nut-radio-group>
          </nut-form-item>
        </nut-form>
      </view>

      <view class="actions">
        <nut-button type="primary" block class="save-btn" :loading="saving" @click="save">
          保存修改
        </nut-button>
        <nut-button
          v-if="!isOwner"
          block
          plain
          type="danger"
          class="delete-btn"
          :loading="deleting"
          @click="handleRemove"
        >
          移除工作人员
        </nut-button>
      </view>
    </template>

    <view v-else class="empty">
      <view class="empty-text">未找到该工作人员</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { showToast } from '@/utils/feedback'
import { computed, ref } from 'vue'
import { useLoad } from '@tarojs/taro'
import { navigateBack } from '@/utils/router'
import {
  ASSIGNABLE_STAFF_ROLES,
  STAFF_ROLE_LABELS,
  STAFF_ROLES,
  type StaffRole,
} from '@/utils/constants'
import {
  listStaff,
  removeStaff,
  updateStaffName,
  updateStaffRole,
  type StaffMember,
} from '@/modules/staff'
import { resolveAvatarDisplayPath } from '@/modules/userProfile'

const loadingTipText = '加载中…'

const targetUserId = ref('')
const member = ref<StaffMember | null>(null)
const avatarDisplay = ref('')
const loading = ref(true)
const saving = ref(false)
const deleting = ref(false)

const form = ref({
  name: '',
  role: STAFF_ROLES.Staff as StaffRole,
})

const roleOptions = ASSIGNABLE_STAFF_ROLES.map((value) => ({
  value,
  label: STAFF_ROLE_LABELS[value],
}))

const isOwner = computed(() => member.value?.role === STAFF_ROLES.Owner)

useLoad((options) => {
  targetUserId.value = options?.userId ? decodeURIComponent(options.userId) : ''
  void loadMember()
})

function roleLabel(role: StaffRole) {
  return STAFF_ROLE_LABELS[role] || '员工'
}

async function loadMember() {
  if (!targetUserId.value) {
    loading.value = false
    return
  }

  loading.value = true
  try {
    const list = await listStaff()
    member.value = list.find((item) => item.userId === targetUserId.value) || null
    if (member.value) {
      form.value.name = member.value.name
      form.value.role = member.value.role
      avatarDisplay.value = member.value.avatarUrl
        ? await resolveAvatarDisplayPath(member.value.avatarUrl)
        : ''
    }
  } catch (err) {
    showToast({
      title: err instanceof Error ? err.message : '加载失败',
      icon: 'none',
    })
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!member.value || saving.value) return

  const name = form.value.name.trim()
  if (!name) {
    showToast({ title: '请填写姓名', icon: 'none' })
    return
  }

  const nameChanged = name !== member.value.name
  const roleChanged = !isOwner.value && form.value.role !== member.value.role
  if (!nameChanged && !roleChanged) {
    showToast({ title: '没有需要保存的修改', icon: 'none' })
    return
  }

  saving.value = true
  try {
    if (nameChanged) {
      await updateStaffName(member.value.userId, name)
    }
    if (roleChanged) {
      await updateStaffRole(member.value.userId, form.value.role)
    }
    showToast({ title: '已保存', icon: 'success' })
    navigateBack()
  } catch (err) {
    showToast({
      title: err instanceof Error ? err.message : '保存失败',
      icon: 'none',
    })
  } finally {
    saving.value = false
  }
}

async function handleRemove() {
  if (!member.value || isOwner.value || deleting.value) return

  const { confirm } = await new Promise<{ confirm: boolean }>((resolve) => {
    wx.showModal({
      title: '确认移除',
      content: `确定将「${member.value?.name}」从工作人员名单中移除？`,
      success: (r) => resolve({ confirm: r.confirm }),
    })
  })

  if (!confirm) return

  deleting.value = true
  try {
    await removeStaff(member.value.userId)
    showToast({ title: '已移除', icon: 'success' })
    navigateBack()
  } catch (err) {
    showToast({
      title: err instanceof Error ? err.message : '移除失败',
      icon: 'none',
    })
  } finally {
    deleting.value = false
  }
}
</script>

<style lang="less">
.page-staff-detail {
  min-height: 100vh;
  padding-bottom: 48rpx;
  background: #f8f8f8;
}
.loading-tip {
  padding: 80rpx 32rpx;
  text-align: center;
  font-size: 26rpx;
  color: #999;
}
.profile-card {
  display: flex;
  align-items: center;
  margin: 16rpx;
  padding: 32rpx;
  background: #fff;
  border-radius: 16rpx;
}
.profile-avatar {
  flex-shrink: 0;
  width: 96rpx;
  height: 96rpx;
  margin-right: 24rpx;
  border-radius: 50%;
  background: #f0f0f0;
  &.placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 44rpx;
    color: #bbb;
  }
}
.profile-meta {
  flex: 1;
  min-width: 0;
}
.profile-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}
.profile-nick {
  margin-top: 6rpx;
  font-size: 26rpx;
  color: #999;
}
.form-card {
  margin: 16rpx;
  padding: 8rpx 0;
  background: #fff;
  border-radius: 16rpx;
}
.readonly-value {
  font-size: 28rpx;
  color: #666;
  word-break: break-all;
  line-height: 1.5;
}
.role-tag {
  display: inline-block;
  padding: 4rpx 12rpx;
  font-size: 22rpx;
  border-radius: 6rpx;
  &.owner {
    color: #667eea;
    background: rgba(102, 126, 234, 0.12);
  }
}
.actions {
  margin: 24rpx 16rpx 0;
}
.save-btn,
.delete-btn {
  border-radius: 48rpx;
  height: 88rpx;
  font-size: 30rpx;
}
.delete-btn {
  margin-top: 16rpx;
}
.empty {
  padding: 80rpx 32rpx;
  text-align: center;
  .empty-text {
    font-size: 26rpx;
    color: #ccc;
  }
}
</style>
