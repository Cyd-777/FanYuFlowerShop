<template>
  <view class="page-staff" :style="navCssVars">
    <AppNavBar />
    <view class="intro">
      <view class="title">工作人员</view>
      <view class="desc">生成邀请码发给同事，对方在小程序「我的」自行输入邀请码即可加入团队</view>
      <view class="prelaunch-tip">请将邀请码通过微信发给对方；对方打开小程序 → 我的 → 输入邀请码。微信分享链接待正式上线后再验证</view>
    </view>

    <view class="add-card">
      <nut-form>
        <nut-form-item label="预设姓名">
          <nut-input v-model="form.name" placeholder="同事在团队中的显示姓名" />
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

      <nut-button type="primary" block class="primary-btn" :loading="creating" @click="handleCreateInvite">
        生成邀请码
      </nut-button>

      <view v-if="activeInvite" class="invite-panel">
        <view class="invite-panel-title">请将下方邀请码发给对方（24 小时内有效，仅可使用一次）</view>
        <view class="invite-code">{{ activeInvite.code }}</view>
        <view class="invite-meta">身份：{{ activeInvite.roleLabel }}</view>
        <view class="invite-meta">过期：{{ inviteExpiresText }}</view>
        <nut-button type="primary" block class="copy-code-btn" @click="copyInviteCode">复制邀请码发给对方</nut-button>
        <button class="share-btn" open-type="share">发送微信邀请</button>
        <nut-button plain block class="copy-btn" @click="copyInvitePath">复制小程序路径</nut-button>
      </view>
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
        </view>
        <text class="item-arrow">›</text>
      </view>
    </view>

    <view class="empty" v-else-if="!loading">
      <view class="empty-text">暂无工作人员，请生成邀请码发给同事，由对方自行输入加入</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { showToast } from '@/utils/feedback'
import { computed, ref } from 'vue'
import { useDidShow, useShareAppMessage } from '@tarojs/taro'
import { navigateTo } from '@/utils/router'
import {
  ASSIGNABLE_STAFF_ROLES,
  STAFF_ROLE_LABELS,
  STAFF_ROLES,
  type StaffRole,
} from '@/utils/constants'
import {
  createStaffInvite,
  listStaff,
  type StaffInviteCreated,
  type StaffMember,
} from '@/services/staff'
import { useNavBarLayout } from '@/composables/useNavBarLayout'

const { cssVars: navCssVars } = useNavBarLayout()

const staffList = ref<StaffMember[]>([])
const loading = ref(false)
const creating = ref(false)
const activeInvite = ref<StaffInviteCreated | null>(null)

const roleOptions = ASSIGNABLE_STAFF_ROLES.map((value) => ({
  value,
  label: STAFF_ROLE_LABELS[value],
}))

const form = ref({
  name: '',
  role: STAFF_ROLES.Staff as StaffRole,
})

const inviteExpiresText = computed(() => {
  const ts = activeInvite.value?.expiresAt || 0
  if (!ts) return '--'
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
})

useDidShow(() => {
  void loadStaff()
})

useShareAppMessage(() => {
  const invite = activeInvite.value
  if (!invite) {
    return {
      title: '梵宇花店',
      path: '/pages/home/index',
    }
  }
  return {
    title: `邀请你加入梵宇花店商家团队（${invite.roleLabel}）`,
    path: invite.sharePath,
  }
})

function roleLabel(role: StaffRole) {
  return STAFF_ROLE_LABELS[role] || '员工'
}

async function loadStaff() {
  loading.value = true
  try {
    staffList.value = await listStaff()
  } catch (err) {
    showToast({
      title: err instanceof Error ? err.message : '加载失败',
      icon: 'none',
    })
  } finally {
    loading.value = false
  }
}

function goDetail(item: StaffMember) {
  navigateTo({
    url: `/pagesMerchant/staff/detail?userId=${encodeURIComponent(item.userId)}`,
  })
}

async function handleCreateInvite() {
  const name = form.value.name.trim() || '工作人员'
  creating.value = true
  try {
    activeInvite.value = await createStaffInvite(name, form.value.role)
    showToast({ title: '邀请已生成', icon: 'success' })
  } catch (err) {
    showToast({
      title: err instanceof Error ? err.message : '生成失败',
      icon: 'none',
    })
  } finally {
    creating.value = false
  }
}

function copyInviteCode() {
  const invite = activeInvite.value
  if (!invite) return
  wx.setClipboardData({
    data: invite.code,
    success: () => showToast({ title: '邀请码已复制', icon: 'success' }),
  })
}

function copyInvitePath() {
  const invite = activeInvite.value
  if (!invite) return
  wx.setClipboardData({
    data: invite.sharePath,
    success: () => showToast({ title: '路径已复制', icon: 'success' }),
  })
}
</script>

<style lang="less">
.page-staff {
  min-height: 100vh;
  background: #f8f8f8;
  box-sizing: border-box;
  width: 100%;
  overflow-x: hidden;
}
.intro {
  padding: 32rpx 24rpx;
  box-sizing: border-box;
  .title {
    font-size: 32rpx;
    font-weight: 600;
    color: #333;
  }
  .desc {
    margin-top: 8rpx;
    font-size: 26rpx;
    color: #999;
    line-height: 1.5;
  }
  .prelaunch-tip {
    margin-top: 12rpx;
    padding: 12rpx 16rpx;
    font-size: 24rpx;
    line-height: 1.45;
    color: #e65100;
    background: #fff8e1;
    border-radius: 12rpx;
  }
}
.add-card {
  margin: 0 16rpx 24rpx;
  padding: 8rpx 24rpx 24rpx;
  background: #fff;
  border-radius: 16rpx;
  box-sizing: border-box;
  overflow: hidden;
}
.primary-btn {
  margin: 16rpx 0 0;
  width: 100%;
  max-width: 100%;
  border-radius: 48rpx;
  height: 88rpx;
  font-size: 30rpx;
  box-sizing: border-box;
}
.invite-panel {
  margin: 24rpx 0 0;
  padding: 24rpx;
  background: #fff8f8;
  border: 2rpx solid #ffe0e0;
  border-radius: 16rpx;
  box-sizing: border-box;
}
.invite-panel-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #c62828;
}
.invite-code {
  margin-top: 16rpx;
  font-size: 56rpx;
  font-weight: 700;
  letter-spacing: 8rpx;
  color: #333;
  text-align: center;
}
.invite-meta {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #666;
}
.copy-code-btn {
  margin-top: 20rpx;
  width: 100%;
  max-width: 100%;
  border-radius: 48rpx;
  height: 88rpx;
  font-size: 30rpx;
  box-sizing: border-box;
}
.share-btn {
  margin-top: 16rpx;
  width: 100%;
  max-width: 100%;
  border-radius: 48rpx;
  height: 88rpx;
  line-height: 88rpx;
  font-size: 30rpx;
  color: #fff;
  background: #e53935;
  border: none;
  box-sizing: border-box;
}
.copy-btn {
  margin-top: 16rpx;
  width: 100%;
  max-width: 100%;
  border-radius: 48rpx;
  height: 88rpx;
  font-size: 30rpx;
  box-sizing: border-box;
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
