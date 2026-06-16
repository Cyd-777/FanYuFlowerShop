<template>
  <view class="page-customize">
    <view class="section">
      <view class="section-title">选择花材</view>
      <scroll-view class="materials" scroll-x enhanced show-scrollbar="{{false}}">
        <view v-for="(m, idx) in materials" :key="idx"
          :class="['material-item', { selected: m.selected }]"
          @click="toggleMaterial(idx)">
          <image class="thumb" :src="m.image" mode="aspectFill" />
          <view class="name">{{ m.name }}</view>
          <view class="price">+¥{{ m.price }}</view>
        </view>
      </scroll-view>
    </view>

    <view class="section">
      <view class="section-title">包装选择</view>
      <radio-group>
        <label v-for="(pkg, idx) in packages" :key="idx" class="pkg-item">
          <radio :value="pkg.name" :checked="idx === selectedPkg" @click="selectedPkg = idx" />
          <text class="pkg-name">{{ pkg.name }}</text>
          <text class="pkg-price">+¥{{ pkg.price }}</text>
        </label>
      </radio-group>
    </view>

    <view class="section">
      <view class="section-title">附赠卡片</view>
      <nut-input v-model="cardMessage" placeholder="写下你想说的话..." type="textarea" />
    </view>

    <view class="action-bar">
      <view class="total">预估: ¥{{ totalPrice }}</view>
      <nut-button type="primary" @click="preview">预览定制</nut-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const materials = ref([
  { name: '红玫瑰', image: '', price: 15, selected: false },
  { name: '白百合', image: '', price: 12, selected: false },
  { name: '向日葵', image: '', price: 10, selected: false },
  { name: '满天星', image: '', price: 8, selected: false },
])

const packages = ref([
  { name: '简约纸包', price: 0 },
  { name: '精美礼盒', price: 20 },
  { name: '鲜花手提袋', price: 15 },
])

const selectedPkg = ref(0)
const cardMessage = ref('')

const totalPrice = computed(() => {
  const matTotal = materials.value.filter(m => m.selected).reduce((s, m) => s + m.price, 0)
  return matTotal + packages.value[selectedPkg.value].price
})

function toggleMaterial(idx: number) {
  materials.value[idx].selected = !materials.value[idx].selected
}

function preview() {
  wx.navigateTo({ url: '/pagesCustomer/customize/preview' })
}
</script>

<style lang="less">
.page-customize { padding-bottom: 120rpx; background: #f8f8f8; }
.section { background: #fff; padding: 24rpx; margin-bottom: 16rpx; }
.section-title { font-size: 28rpx; font-weight: 600; color: #333; margin-bottom: 16rpx; }
.materials { display: flex; white-space: nowrap; }
.material-item {
  display: inline-flex; flex-direction: column; align-items: center;
  margin-right: 20rpx; padding: 16rpx; border: 2rpx solid #eee; border-radius: 12rpx;
  &.selected { border-color: #e53935; background: #fce4ec; }
  .thumb { width: 120rpx; height: 120rpx; border-radius: 8rpx; background: #f0f0f0; }
  .name { margin-top: 8rpx; font-size: 24rpx; color: #333; }
  .price { font-size: 22rpx; color: #e53935; }
}
.pkg-item { display: flex; align-items: center; padding: 12rpx 0; }
.pkg-name { margin: 0 16rpx; flex: 1; font-size: 26rpx; }
.pkg-price { font-size: 24rpx; color: #e53935; }
.action-bar {
  position: fixed; bottom: 0; left: 0; right: 0;
  display: flex; align-items: center; padding: 16rpx 24rpx;
  background: #fff; border-top: 2rpx solid #eee;
  .total { flex: 1; font-size: 32rpx; font-weight: 600; color: #e53935; }
}
</style>
