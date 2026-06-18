<template>
  <view class="page-staff-detail">
    <view v-if="loading" class="loading-tip">加载中…</view>

    <template v-else-if="member">
      <view class="form-card">
        <nut-form>
          <nut-form-item label="OpenID">
            <view class="readonly-value">{{ member.openid }}</view>
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
} from '@/services/staff'

const targetOpenid = ref('')
const member = ref<StaffMember | null>(null)
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
  targetOpenid.value = options?.openid ? decodeURIComponent(options.openid) : ''
  void loadMember()
})

function roleLabel(role: StaffRole) {
  return STAFF_ROLE_LABELS[role] || '员工'
}

async function loadMember() {
  if (!targetOpenid.value) {
    loading.value = false
    return
  }

  loading.value = true
  try {
    const list = await listStaff()
    const found = list.find((item) => item.openid === targetOpenid.value) || null
    member.value = found
    if (found) {
      form.value.name = found.name
      form.value.role = found.role
    }
  } catch (err) {
    wx.showToast({
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
    wx.showToast({ title: '请填写姓名', icon: 'none' })
    return
  }

  const nameChanged = name !== member.value.name
  const roleChanged = !isOwner.value && form.value.role !== member.value.role
  if (!nameChanged && !roleChanged) {
    wx.showToast({ title: '没有需要保存的修改', icon: 'none' })
    return
  }

  saving.value = true
  try {
    if (nameChanged) {
      await updateStaffName(member.value.openid, name)
    }
    if (roleChanged) {
      await updateStaffRole(member.value.openid, form.value.role)
    }
    wx.showToast({ title: '已保存', icon: 'success' })
    navigateBack()
  } catch (err) {
    wx.showToast({
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
    await removeStaff(member.value.openid)
    wx.showToast({ title: '已移除', icon: 'success' })
    navigateBack()
  } catch (err) {
    wx.showToast({
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
