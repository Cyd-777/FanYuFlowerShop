<template>
  <view class="page-edit-addr">
    <view class="wechat-tip">
      地址来自微信地址簿。如需修改，请在微信地址中编辑后重新导入。
    </view>

    <view class="quick-actions">
      <view class="quick-btn primary" @click="reimportWechatAddress">
        <text class="quick-icon">📮</text>
        <text>从微信重新导入</text>
      </view>
    </view>

    <view class="form-card">
      <view class="readonly-row">
        <text class="readonly-label">收件人</text>
        <text class="readonly-value">{{ form.name || '—' }}</text>
      </view>
      <view class="readonly-row">
        <text class="readonly-label">手机号</text>
        <text class="readonly-value">{{ form.phone || '—' }}</text>
      </view>
      <view class="readonly-row">
        <text class="readonly-label">所在地区</text>
        <text class="readonly-value">{{ regionText || '—' }}</text>
      </view>
      <view class="readonly-row">
        <text class="readonly-label">详细地址</text>
        <text class="readonly-value">{{ form.detail || '—' }}</text>
      </view>

      <nut-cell>
        <label class="default-switch">
          <text>设为默认地址</text>
          <nut-switch v-model="form.isDefault" @change="onDefaultChange" />
        </label>
      </nut-cell>
    </view>

    <view class="actions">
      <nut-button
        block
        plain
        type="danger"
        class="delete-btn"
        :loading="deleting"
        @click="handleDelete"
      >
        删除地址
      </nut-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useLoad } from '@tarojs/taro'
import { navigateBack } from '@/utils/router'
import {
  getAddress,
  importWechatAddressAndSave,
  removeAddress,
  saveAddress,
  toAddressForm,
  wechatAddressToForm,
} from '@/services/address'
import { chooseWechatAddress, formatRegionText, handleLocationError } from '@/utils/location'
import type { UserAddressForm } from '@/types/address'

const addressId = ref('')
const deleting = ref(false)
const reimporting = ref(false)

const form = ref<UserAddressForm>({
  name: '',
  phone: '',
  province: '',
  city: '',
  district: '',
  detail: '',
  isDefault: false,
})

const regionText = computed(() =>
  formatRegionText(form.value.province, form.value.city, form.value.district),
)

useLoad((options) => {
  addressId.value = options?.id ? decodeURIComponent(options.id) : ''
  if (!addressId.value) {
    void importWechatAddressAndBack()
    return
  }

  const existing = getAddress(addressId.value)
  if (!existing) {
    wx.showToast({ title: '地址不存在', icon: 'none' })
    setTimeout(() => navigateBack(), 1500)
    return
  }

  form.value = toAddressForm(existing)
})

async function importWechatAddressAndBack() {
  try {
    await importWechatAddressAndSave()
    wx.showToast({ title: '地址已保存', icon: 'success' })
    setTimeout(() => navigateBack(), 500)
  } catch (err) {
    handleLocationError(err, '添加地址失败')
    setTimeout(() => navigateBack(), 800)
  }
}

async function reimportWechatAddress() {
  if (reimporting.value || !addressId.value) return

  reimporting.value = true
  try {
    const result = await chooseWechatAddress()
    const nextForm = wechatAddressToForm(result, { isDefault: form.value.isDefault })
    saveAddress(nextForm, addressId.value)
    form.value = nextForm
    wx.showToast({ title: '已更新为微信地址', icon: 'success' })
  } catch (err) {
    handleLocationError(err, '导入微信地址失败')
  } finally {
    reimporting.value = false
  }
}

function onDefaultChange(value: boolean) {
  if (!addressId.value) return
  try {
    saveAddress({ ...form.value, isDefault: value }, addressId.value)
  } catch (err) {
    wx.showToast({
      title: err instanceof Error ? err.message : '保存失败',
      icon: 'none',
    })
  }
}

async function handleDelete() {
  if (!addressId.value || deleting.value) return

  const { confirm } = await new Promise<{ confirm: boolean }>((resolve) => {
    wx.showModal({
      title: '删除地址',
      content: '确定删除这条收货地址吗？',
      success: (r) => resolve({ confirm: r.confirm }),
    })
  })

  if (!confirm) return

  deleting.value = true
  try {
    removeAddress(addressId.value)
    wx.showToast({ title: '已删除', icon: 'success' })
    setTimeout(() => navigateBack(), 500)
  } catch (err) {
    wx.showToast({
      title: err instanceof Error ? err.message : '删除失败',
      icon: 'none',
    })
  } finally {
    deleting.value = false
  }
}
</script>

<style lang="less">
@import '@/styles/tokens.less';

.page-edit-addr {
  min-height: 100vh;
  background: @color-bg-page;
  padding-bottom: 32rpx;
}
.wechat-tip {
  margin: 16rpx;
  padding: 20rpx 24rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: @color-text-secondary;
  background: @color-bg-card;
  border-radius: @radius-md;
}
.quick-actions {
  display: flex;
  gap: 16rpx;
  margin: 0 16rpx 16rpx;
}
.quick-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  height: 80rpx;
  background: @color-bg-card;
  border-radius: @radius-md;
  font-size: 26rpx;
  color: @color-text-primary;
  &.primary {
    color: @color-primary;
  }
}
.quick-icon {
  font-size: 30rpx;
}
.form-card {
  margin: 0 16rpx;
  background: @color-bg-card;
  border-radius: @radius-md;
  overflow: hidden;
}
.readonly-row {
  display: flex;
  padding: 24rpx 32rpx;
  border-bottom: 2rpx solid @color-border;
}
.readonly-label {
  flex-shrink: 0;
  width: 160rpx;
  font-size: 28rpx;
  color: @color-text-secondary;
}
.readonly-value {
  flex: 1;
  font-size: 28rpx;
  color: @color-text-primary;
  line-height: 1.5;
}
.default-switch {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  font-size: 28rpx;
}
.actions {
  margin: 24rpx 16rpx 0;
}
.delete-btn {
  border-radius: @radius-pill;
  height: 88rpx;
  font-size: 30rpx;
}
</style>
