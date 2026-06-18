<template>
  <view class="page-staff">
    <view class="intro">
      <view class="title">工作人员</view>
      <view class="desc">填写 OpenID 添加工作人员，并设置身份</view>
    </view>

    <view class="add-card">
      <nut-form>
        <nut-form-item label="OpenID">
          <nut-input v-model="form.openid" placeholder="粘贴或输入对方 OpenID" />
        </nut-form-item>
        <nut-form-item label="姓名">
          <nut-input v-model="form.name" placeholder="工作人员姓名" />
        </nut-form-item>
        <nut-form-item label="身份">
          <nut-radio-group v-model="form.role" direction="horizontal">
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
      <nut-button type="primary" block class="add-btn" :loading="adding" @click="handleAdd">
        添加工作人员
      </nut-button>
      <nut-button plain block class="scan-btn" :loading="adding" @click="scanToAdd">
        扫码添加
      </nut-button>
    </view>

    <view class="staff-list" v-if="staffList.length">
      <view class="section-title">当前名单（{{ staffList.length }}）</view>
      <view
        v-for="item in staffList"
        :key="item._id"
        class="staff-item"
        @click="goDetail(item)"
      >
        <view class="staff-info">
          <view class="staff-name">
            {{ item.name }}
            <text class="role-tag" :class="item.role">{{ roleLabel(item.role) }}</text>
          </view>
          <view class="staff-openid">{{ maskOpenid(item.openid) }}</view>
        </view>
        <text class="item-arrow">›</text>
      </view>
    </view>

    <view class="empty" v-else-if="!loading">
      <view class="empty-text">暂无工作人员，请在上方填写 OpenID 添加</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useDidShow } from '@tarojs/taro'
import { navigateTo } from '@/utils/router'
import {
  ASSIGNABLE_STAFF_ROLES,
  STAFF_ROLE_LABELS,
  STAFF_ROLES,
  type StaffRole,
} from '@/utils/constants'
import { normalizeOpenid, parseIdentityQr } from '@/utils/identity'
import { listStaff, addStaff, type StaffMember } from '@/services/staff'

const staffList = ref<StaffMember[]>([])
const loading = ref(false)
const adding = ref(false)

const roleOptions = ASSIGNABLE_STAFF_ROLES.map((value) => ({
  value,
  label: STAFF_ROLE_LABELS[value],
}))

const form = ref({
  openid: '',
  name: '',
  role: STAFF_ROLES.Staff as StaffRole,
})

useDidShow(() => {
  loadStaff()
})

function roleLabel(role: StaffRole) {
  return STAFF_ROLE_LABELS[role] || '员工'
}

async function loadStaff() {
  loading.value = true
  try {
    staffList.value = await listStaff()
  } catch (err) {
    wx.showToast({
      title: err instanceof Error ? err.message : '加载失败',
      icon: 'none',
    })
  } finally {
    loading.value = false
  }
}

function maskOpenid(openid: string) {
  if (openid.length <= 8) return openid
  return `${openid.slice(0, 4)}...${openid.slice(-4)}`
}

function goDetail(item: StaffMember) {
  navigateTo({
    url: `/pagesMerchant/staff/detail?openid=${encodeURIComponent(item.openid)}`,
  })
}

function pickRole(): Promise<StaffRole | null> {
  return new Promise((resolve) => {
    wx.showActionSheet({
      itemList: roleOptions.map((item) => item.label),
      success: (res) => resolve(roleOptions[res.tapIndex]?.value || null),
      fail: () => resolve(null),
    })
  })
}

async function submitAdd(openid: string, name: string, role: StaffRole) {
  adding.value = true
  try {
    await addStaff(openid, name, role)
    wx.showToast({ title: '添加成功', icon: 'success' })
    form.value.openid = ''
    form.value.name = ''
    form.value.role = STAFF_ROLES.Staff
    await loadStaff()
  } catch (err) {
    wx.showToast({
      title: err instanceof Error ? err.message : '添加失败',
      icon: 'none',
    })
  } finally {
    adding.value = false
  }
}

async function handleAdd() {
  const openid = normalizeOpenid(form.value.openid)
  if (!openid) {
    wx.showToast({ title: '请填写有效的 OpenID', icon: 'none' })
    return
  }

  const name = form.value.name.trim() || '工作人员'
  await submitAdd(openid, name, form.value.role)
}

async function scanToAdd() {
  try {
    const res = await wx.scanCode({ scanType: ['qrCode'] })
    const openid = parseIdentityQr(res.result)
    if (!openid) {
      wx.showToast({ title: '无法识别的身份码', icon: 'none' })
      return
    }

    const { confirm, content } = await new Promise<{ confirm: boolean; content: string }>(
      (resolve) => {
        wx.showModal({
          title: '添加工作人员',
          editable: true,
          placeholderText: '请输入姓名',
          content: '',
          success: (r) =>
            resolve({ confirm: r.confirm, content: (r as { content?: string }).content || '' }),
        })
      },
    )

    if (!confirm) return

    const role = await pickRole()
    if (!role) return

    await submitAdd(openid, content.trim() || '工作人员', role)
  } catch (err) {
    if ((err as { errMsg?: string }).errMsg?.includes('cancel')) return
    wx.showToast({
      title: err instanceof Error ? err.message : '添加失败',
      icon: 'none',
    })
  }
}
</script>

<style lang="less">
.page-staff {
  min-height: 100vh;
  background: #f8f8f8;
}
.intro {
  padding: 32rpx;
  .title {
    font-size: 32rpx;
    font-weight: 600;
    color: #333;
  }
  .desc {
    margin-top: 8rpx;
    font-size: 26rpx;
    color: #999;
  }
}
.add-card {
  margin: 0 16rpx 24rpx;
  padding: 8rpx 0 24rpx;
  background: #fff;
  border-radius: 16rpx;
}
.add-btn,
.scan-btn {
  margin: 16rpx 32rpx 0;
  border-radius: 48rpx;
  height: 88rpx;
  font-size: 30rpx;
}
.section-title {
  padding: 0 32rpx 16rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}
.staff-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 16rpx 16rpx;
  padding: 24rpx 32rpx;
  background: #fff;
  border-radius: 16rpx;
}
.staff-info {
  flex: 1;
  min-width: 0;
}
.staff-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
}
.role-tag {
  margin-left: 12rpx;
  padding: 2rpx 10rpx;
  font-size: 20rpx;
  border-radius: 6rpx;
  &.owner {
    color: #667eea;
    background: rgba(102, 126, 234, 0.12);
  }
  &.manager {
    color: #e65100;
    background: rgba(230, 81, 0, 0.1);
  }
  &.staff {
    color: #999;
    background: #f5f5f5;
  }
}
.staff-openid {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #bbb;
}
.item-arrow {
  flex-shrink: 0;
  margin-left: 16rpx;
  font-size: 36rpx;
  color: #ccc;
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
