<template>
  <view class="page-merchant-goods-edit">
    <nut-form>
      <nut-form-item label="商品名称">
        <nut-input v-model="form.name" placeholder="请输入商品名称" />
      </nut-form-item>

      <nut-form-item label="商品价格">
        <nut-input v-model="form.price" placeholder="请输入价格" type="digit" />
      </nut-form-item>

      <nut-form-item label="商品库存">
        <nut-input v-model="form.stock" placeholder="请输入库存数量" type="number" />
      </nut-form-item>

      <nut-form-item label="商品分类">
        <nut-input v-model="form.category" placeholder="选择分类" disabled is-link />
      </nut-form-item>

      <nut-form-item label="商品描述">
        <nut-input v-model="form.description" placeholder="请输入商品描述" type="textarea" />
      </nut-form-item>

      <nut-form-item label="上架状态">
        <nut-switch v-model="form.onSale" />
      </nut-form-item>
    </nut-form>

    <nut-button type="primary" block class="save-btn" @click="save">保存</nut-button>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { navigateBack, navigateTo } from '@/utils/router'

const form = ref({
  name: '',
  price: '',
  stock: '',
  category: '',
  description: '',
  onSale: true,
})

function save() {
  wx.showToast({ title: '保存成功', icon: 'success' })
  setTimeout(() => navigateBack(), 1500)
}
</script>

<style lang="less">
.page-merchant-goods-edit { background: #f8f8f8; min-height: 100vh; }
.save-btn { margin: 48rpx 32rpx; border-radius: 48rpx; }
</style>
