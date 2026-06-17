<template>
  <nut-popup
    v-model:visible="show"
    round
    position="center"
    :close-on-click-overlay="true"
    :style="{ padding: '0' }"
  >
    <view class="identity-modal">
      <view class="modal-title">我的身份码</view>
      <view class="modal-desc">出示此码供商家扫码核销，或由管理员扫码添加为工作人员</view>

      <view v-if="modules.length" class="qr-wrap" :style="qrWrapStyle">
        <view v-for="(row, rowI) in modules" :key="rowI" class="qr-row">
          <view
            v-for="(cell, colI) in row"
            :key="colI"
            class="qr-cell"
            :class="{ on: cell.isBlack }"
            :style="cellStyle"
          />
        </view>
      </view>
      <view v-else class="qr-placeholder">生成中…</view>

      <view class="openid-row">{{ openid }}</view>
      <nut-button block type="primary" @click="copyOpenid">复制 OpenID</nut-button>
    </view>
  </nut-popup>
</template>

<script setup lang="ts">
import { computed, watch, ref } from 'vue'
// @ts-expect-error uqrcodejs 无类型声明
import UQRCode from 'uqrcodejs'
import { encodeIdentityQr } from '@/utils/identity'

interface QrCell {
  isBlack: boolean
}

const props = defineProps<{
  visible: boolean
  openid: string
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const modules = ref<QrCell[][]>([])
const qrSizeRpx = 400

const show = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val),
})

const cellSizeRpx = computed(() => {
  const count = modules.value.length || 1
  return Math.floor(qrSizeRpx / count)
})

const qrWrapStyle = computed(() => ({
  width: `${qrSizeRpx}rpx`,
  height: `${qrSizeRpx}rpx`,
}))

const cellStyle = computed(() => ({
  width: `${cellSizeRpx.value}rpx`,
  height: `${cellSizeRpx.value}rpx`,
}))

function buildModules() {
  if (!props.openid) {
    modules.value = []
    return
  }

  const qr = new UQRCode()
  qr.data = encodeIdentityQr(props.openid)
  qr.size = 200
  qr.make()
  modules.value = qr.modules as QrCell[][]
}

watch(
  () => [props.visible, props.openid] as const,
  ([visible, openid]) => {
    if (visible && openid) {
      buildModules()
    }
  },
  { immediate: true },
)

function copyOpenid() {
  if (!props.openid) return
  wx.setClipboardData({
    data: props.openid,
    success: () => wx.showToast({ title: 'OpenID 已复制', icon: 'success' }),
  })
}
</script>

<style lang="less">
.identity-modal {
  width: 560rpx;
  padding: 48rpx 40rpx;
  text-align: center;
}
.modal-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #333;
}
.modal-desc {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #999;
  line-height: 1.5;
}
.qr-wrap {
  display: flex;
  flex-direction: column;
  margin: 32rpx auto 24rpx;
  background: #fff;
  border: 2rpx solid #eee;
  overflow: hidden;
}
.qr-row {
  display: flex;
  flex-direction: row;
  line-height: 0;
}
.qr-cell {
  flex-shrink: 0;
  background: #fff;
  &.on {
    background: #000;
  }
}
.qr-placeholder {
  width: 400rpx;
  height: 400rpx;
  margin: 32rpx auto 24rpx;
  line-height: 400rpx;
  font-size: 26rpx;
  color: #ccc;
  background: #fafafa;
  border-radius: 8rpx;
}
.openid-row {
  margin-bottom: 24rpx;
  padding: 16rpx;
  font-size: 22rpx;
  color: #666;
  word-break: break-all;
  background: #f8f8f8;
  border-radius: 8rpx;
}
</style>
