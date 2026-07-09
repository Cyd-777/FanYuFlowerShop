<template>
  <view class="page-shop-setting">
    <AppNavBar />
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

    <view class="page-actions">
      <nut-button type="primary" block class="action-btn" :loading="saving" @click="save">
        保存设置
      </nut-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { showToast } from '@/utils/feedback'
import { ref } from 'vue'
import { useDidShow } from '@tarojs/taro'
import { navigateBack } from '@/utils/router'
import { useShopStore, type ShopSettings } from '@/stores/shop'

const shopStore = useShopStore()
const form = ref<ShopSettings>({ ...shopStore.settings })
const saving = ref(false)

useDidShow(() => {
  void shopStore.hydrate().then(() => {
    form.value = { ...shopStore.settings }
  })
})

async function save() {
  const name = form.value.shopName.trim()
  if (!name) {
    showToast({ title: '请填写店铺名称', icon: 'none' })
    return
  }

  if (saving.value) return
  saving.value = true

  try {
    await shopStore.updateSettings({ ...form.value, shopName: name })
    showToast({ title: '设置已保存', icon: 'success' })
    setTimeout(() => navigateBack(), 1500)
  } catch (err) {
    showToast({
      title: err instanceof Error ? err.message : '保存失败',
      icon: 'none',
    })
  } finally {
    saving.value = false
  }
}
</script>

<style lang="less">
.page-shop-setting {
  background: @color-bg-page;
  min-height: 100vh;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
}
.page-actions {
  padding: 48rpx 32rpx;
  box-sizing: border-box;
}
.action-btn {
  width: 100%;
  max-width: 100%;
  border-radius: 48rpx;
  box-sizing: border-box;
}
</style>
