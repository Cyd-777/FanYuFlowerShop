<template>
  <view class="page-shop-setting">
    <nut-form>
      <nut-form-item label="店铺名称">
        <nut-input v-model="form.shopName" placeholder="请输入店铺名称" />
      </nut-form-item>
      <nut-form-item label="联系电话">
        <nut-input v-model="form.phone" placeholder="请输入联系电话" type="tel" />
      </nut-form-item>
      <nut-form-item label="营业开始时间">
        <nut-input v-model="form.openTime" placeholder="如 09:00" />
      </nut-form-item>
      <nut-form-item label="营业结束时间">
        <nut-input v-model="form.closeTime" placeholder="如 21:00" />
      </nut-form-item>
      <nut-form-item label="配送说明">
        <nut-input v-model="form.deliveryNote" placeholder="配送范围、费用等说明" type="textarea" />
      </nut-form-item>
    </nut-form>

    <nut-button type="primary" block class="save-btn" @click="save">保存设置</nut-button>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { navigateBack } from '@/utils/router'

const form = ref({
  shopName: '梵宇花店',
  phone: '',
  openTime: '09:00',
  closeTime: '21:00',
  deliveryNote: '',
})

function save() {
  wx.showToast({ title: '设置已保存', icon: 'success' })
  setTimeout(() => navigateBack(), 1500)
}
</script>

<style lang="less">
.page-shop-setting { background: #f8f8f8; min-height: 100vh; }
.save-btn { margin: 48rpx 32rpx; border-radius: 48rpx; }
</style>
