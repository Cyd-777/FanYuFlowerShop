<template>
  <view class="page-edit-addr">
    <nut-form>
      <nut-form-item label="收件人">
        <nut-input v-model="form.name" placeholder="请输入收件人姓名" />
      </nut-form-item>
      <nut-form-item label="手机号">
        <nut-input v-model="form.phone" placeholder="请输入手机号" type="tel" />
      </nut-form-item>
      <nut-form-item label="详细地址">
        <nut-input v-model="form.detail" placeholder="请输入详细地址" type="textarea" />
      </nut-form-item>
    </nut-form>
    <nut-cell>
      <label class="default-switch">
        <text>设为默认地址</text>
        <nut-switch v-model="form.isDefault" />
      </label>
    </nut-cell>
    <nut-button type="primary" block class="save-btn" @click="save">保存</nut-button>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { navigateBack } from '@/utils/router'

const form = ref({
  name: '',
  phone: '',
  detail: '',
  isDefault: false,
})

function save() {
  wx.showToast({ title: '保存成功', icon: 'success' })
  setTimeout(() => navigateBack(), 1500)
}
</script>

<style lang="less">
.page-edit-addr { background: #f8f8f8; min-height: 100vh; }
.default-switch { display: flex; justify-content: space-between; align-items: center; width: 100%; font-size: 28rpx; }
.save-btn { margin: 48rpx 32rpx; border-radius: 48rpx; }
</style>
