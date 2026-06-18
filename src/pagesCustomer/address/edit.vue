<template>
  <view class="page-edit-addr">
    <SmartAddressInput
      :detail="form.detail"
      :province="form.province"
      :city="form.city"
      :district="form.district"
      @update:detail="form.detail = $event"
      @apply="applySmartFill"
    />

    <view class="quick-actions">
      <view class="quick-btn" @click="importWechatAddress">
        <text class="quick-icon">📮</text>
        <text>微信地址</text>
      </view>
      <view class="quick-btn" @click="pickMapLocation">
        <text class="quick-icon">📍</text>
        <text>地图选址</text>
      </view>
    </view>

    <view class="form-card">
      <nut-form>
        <nut-form-item label="收件人">
          <nut-input v-model="form.name" placeholder="请输入收件人姓名" />
        </nut-form-item>
        <nut-form-item label="手机号">
          <nut-input v-model="form.phone" placeholder="请输入手机号" type="tel" />
        </nut-form-item>
        <nut-form-item label="所在地区">
          <picker mode="region" :value="regionPickerValue" @change="onRegionChange">
            <view class="picker-value" :class="{ placeholder: !regionText }">
              {{ regionText || '请选择省 / 市 / 区' }}
            </view>
          </picker>
        </nut-form-item>
      </nut-form>

      <view v-if="hasMapPin" class="map-tip">
        <text class="map-tip-label">地图定位</text>
        <text class="map-tip-text">
          {{ form.poiName || '已选位置' }}
          <text v-if="mapCoordsText" class="map-coords">（{{ mapCoordsText }}）</text>
        </text>
      </view>

      <nut-cell>
        <label class="default-switch">
          <text>设为默认地址</text>
          <nut-switch v-model="form.isDefault" />
        </label>
      </nut-cell>
    </view>

    <view class="actions">
      <nut-button type="primary" block class="save-btn" :loading="saving" @click="save">
        保存地址
      </nut-button>
      <nut-button
        v-if="addressId"
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
import SmartAddressInput from '@/components/SmartAddressInput.vue'
import {
  createNewAddressForm,
  getAddress,
  removeAddress,
  saveAddress,
  toAddressForm,
} from '@/services/address'
import {
  applyMapLocationToForm,
  chooseMapLocationWithAuth,
  chooseWechatAddress,
  formatRegionText,
  handleLocationError,
} from '@/utils/location'
import type { UserAddressForm } from '@/types/address'

const addressId = ref('')
const saving = ref(false)
const deleting = ref(false)
const locating = ref(false)

const form = ref<UserAddressForm>(createNewAddressForm())

const regionText = computed(() =>
  formatRegionText(form.value.province, form.value.city, form.value.district),
)
const regionPickerValue = computed(() =>
  [form.value.province, form.value.city, form.value.district].filter(Boolean),
)
const hasMapPin = computed(
  () => typeof form.value.latitude === 'number' && typeof form.value.longitude === 'number',
)
const mapCoordsText = computed(() => {
  if (!hasMapPin.value) return ''
  return `${form.value.latitude!.toFixed(5)}, ${form.value.longitude!.toFixed(5)}`
})

useLoad((options) => {
  addressId.value = options?.id ? decodeURIComponent(options.id) : ''
  if (!addressId.value) return

  const existing = getAddress(addressId.value)
  if (!existing) {
    wx.showToast({ title: '地址不存在', icon: 'none' })
    setTimeout(() => navigateBack(), 1500)
    return
  }

  form.value = toAddressForm(existing)
})

function applySmartFill(payload: Partial<UserAddressForm>) {
  if (payload.name) form.value.name = payload.name
  if (payload.phone) form.value.phone = payload.phone
  if (payload.province) form.value.province = payload.province
  if (payload.city) form.value.city = payload.city
  if (payload.district) form.value.district = payload.district
  if (payload.detail) form.value.detail = payload.detail
  if ('latitude' in payload) form.value.latitude = payload.latitude
  if ('longitude' in payload) form.value.longitude = payload.longitude
  if ('poiName' in payload) form.value.poiName = payload.poiName
}

function onRegionChange(event: { detail: { value: string[] } }) {
  const [province = '', city = '', district = ''] = event.detail.value || []
  form.value.province = province
  form.value.city = city
  form.value.district = district
}

async function importWechatAddress() {
  try {
    const result = await chooseWechatAddress()
    applySmartFill({
      name: result.name,
      phone: result.phone,
      province: result.province,
      city: result.city,
      district: result.district,
      detail: result.detail,
      latitude: undefined,
      longitude: undefined,
      poiName: undefined,
    })
    wx.showToast({ title: '已导入微信地址', icon: 'success' })
  } catch (err) {
    handleLocationError(err, '导入微信地址失败')
  }
}

async function pickMapLocation() {
  if (locating.value) return

  locating.value = true
  try {
    const location = await chooseMapLocationWithAuth()
    applyMapLocationToForm(form.value, location)
    wx.showToast({ title: '已选择地图位置', icon: 'success' })
  } catch (err) {
    handleLocationError(err, '地图选点失败')
  } finally {
    locating.value = false
  }
}

async function save() {
  if (saving.value) return

  saving.value = true
  try {
    saveAddress(form.value, addressId.value || undefined)
    wx.showToast({ title: '保存成功', icon: 'success' })
    setTimeout(() => navigateBack(), 500)
  } catch (err) {
    wx.showToast({
      title: err instanceof Error ? err.message : '保存失败',
      icon: 'none',
    })
  } finally {
    saving.value = false
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
.quick-actions {
  display: flex;
  gap: 16rpx;
  margin: 16rpx;
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
.picker-value {
  width: 100%;
  min-height: 48rpx;
  font-size: 28rpx;
  color: @color-text-primary;
  line-height: 1.5;
  &.placeholder {
    color: @color-text-placeholder;
  }
}
.map-tip {
  padding: 0 32rpx 16rpx;
  font-size: 24rpx;
  line-height: 1.6;
}
.map-tip-label {
  display: block;
  margin-bottom: 4rpx;
  color: @color-text-tertiary;
}
.map-tip-text {
  color: @color-text-secondary;
}
.map-coords {
  color: @color-text-tertiary;
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
.save-btn,
.delete-btn {
  border-radius: @radius-pill;
  height: 88rpx;
  font-size: 30rpx;
}
.delete-btn {
  margin-top: 16rpx;
}
</style>
