<template>
  <view class="page-staff">
    <view class="intro">
      <view class="title">工作人员</view>
      <view class="desc">扫描对方的身份码，将其添加为工作人员</view>
    </view>

    <nut-button type="primary" block class="scan-btn" :loading="adding" @click="scanToAdd">
      扫码添加工作人员
    </nut-button>

    <view class="staff-list" v-if="staffList.length">
      <view class="section-title">当前名单（{{ staffList.length }}）</view>
      <view v-for="item in staffList" :key="item._id" class="staff-item">
        <view class="staff-info">
          <view class="staff-name">
            {{ item.name }}
            <text class="role-tag" v-if="item.role === 'owner'">店长</text>
            <text class="role-tag staff" v-else>员工</text>
          </view>
          <view class="staff-openid">{{ maskOpenid(item.openid) }}</view>
        </view>
        <nut-button
          v-if="item.role !== 'owner'"
          size="small"
          plain
          type="danger"
          @click="handleRemove(item)"
        >
          移除
        </nut-button>
      </view>
    </view>

    <view class="empty" v-else-if="!loading">
      <view class="empty-text">暂无工作人员，点击上方按钮扫码添加</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useDidShow } from '@tarojs/taro'
import { parseIdentityQr } from '@/utils/identity'
import { listStaff, addStaff, removeStaff, type StaffMember } from '@/services/staff'

const staffList = ref<StaffMember[]>([])
const loading = ref(false)
const adding = ref(false)

useDidShow(() => {
  loadStaff()
})

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

    adding.value = true
    await addStaff(openid, content.trim() || '工作人员')
    wx.showToast({ title: '添加成功', icon: 'success' })
    await loadStaff()
  } catch (err) {
    if ((err as { errMsg?: string }).errMsg?.includes('cancel')) return
    wx.showToast({
      title: err instanceof Error ? err.message : '添加失败',
      icon: 'none',
    })
  } finally {
    adding.value = false
  }
}

async function handleRemove(item: StaffMember) {
  const { confirm } = await new Promise<{ confirm: boolean }>((resolve) => {
    wx.showModal({
      title: '确认移除',
      content: `确定将「${item.name}」从工作人员名单中移除？`,
      success: (r) => resolve({ confirm: r.confirm }),
    })
  })

  if (!confirm) return

  try {
    await removeStaff(item.openid)
    wx.showToast({ title: '已移除', icon: 'success' })
    await loadStaff()
  } catch (err) {
    wx.showToast({
      title: err instanceof Error ? err.message : '移除失败',
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
.scan-btn {
  margin: 0 32rpx 32rpx;
  border-radius: 48rpx;
  height: 96rpx;
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
.staff-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
}
.role-tag {
  margin-left: 12rpx;
  padding: 2rpx 10rpx;
  font-size: 20rpx;
  color: #667eea;
  background: rgba(102, 126, 234, 0.12);
  border-radius: 6rpx;
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
.empty {
  padding: 80rpx 32rpx;
  text-align: center;
  .empty-text {
    font-size: 26rpx;
    color: #ccc;
  }
}
</style>
