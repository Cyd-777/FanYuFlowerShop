<template>
  <view class="page-notify-send">
    <AppNavBar :title="pageTitle" />
    <AppFeedbackHost />

    <view class="notify-send-card">
      <view class="notify-send-label">{{ recipientLabel }}</view>
      <view v-if="loadingRecipients" class="notify-send-hint">{{ loadingText }}</view>
      <view v-else-if="!recipients.length" class="notify-send-hint">{{ noRecipientText }}</view>
      <view v-else class="recipient-list">
        <view
          v-for="person in recipients"
          :key="person.userId"
          class="recipient-item"
          :class="{ active: selectedIds.has(person.userId) }"
          @tap="toggleRecipient(person.userId)"
        >
          <view class="recipient-name">{{ person.name }}</view>
          <view class="recipient-role">{{ person.roleLabel }}</view>
        </view>
      </view>
    </view>

    <view class="notify-send-card">
      <view class="notify-send-label">{{ titleLabel }}</view>
      <input
        class="notify-send-input"
        :value="title"
        placeholder="可选，留空自动生成"
        @input="onTitleInput"
      />
      <view class="notify-send-label">{{ bodyLabel }}</view>
      <textarea
        class="notify-send-textarea"
        :value="body"
        placeholder="请输入要通知同事的内容"
        maxlength="500"
        @input="onBodyInput"
      />
    </view>

    <view class="notify-send-footer">
      <nut-button type="primary" block :loading="sending" @click="submit">
        {{ submitText }}
      </nut-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useLoad } from '@tarojs/taro'
import AppFeedbackHost from '@/components/AppFeedbackHost.vue'
import { showToast } from '@/utils/feedback'
import { navigateBack } from '@/utils/router'
import {
  listNotifyRecipients,
  sendBizNotification,
  type BizNotificationContext,
  type BizNotificationType,
  type NotifyRecipient,
} from '@/modules/notify'

const pageTitle = '发送通知'
const recipientLabel = '接收同事'
const titleLabel = '标题'
const bodyLabel = '内容'
const submitText = '发送'
const loadingText = '加载同事列表…'
const noRecipientText = '暂无其他同事可通知'

const loadingRecipients = ref(true)
const sending = ref(false)
const recipients = ref<NotifyRecipient[]>([])
const selectedIds = ref<Set<string>>(new Set())
const title = ref('')
const body = ref('')
const notifyType = ref<BizNotificationType>('staff_message')
const context = ref<BizNotificationContext>({})

function onTitleInput(e: { detail: { value: string } }) {
  title.value = e.detail.value
}

function onBodyInput(e: { detail: { value: string } }) {
  body.value = e.detail.value
}

function toggleRecipient(userId: string) {
  const next = new Set(selectedIds.value)
  if (next.has(userId)) next.delete(userId)
  else next.add(userId)
  selectedIds.value = next
}

function buildDefaultBody(type: BizNotificationType, ctx: BizNotificationContext) {
  if (type === 'order_context' && ctx.orderNo) {
    return `请关注订单 ${ctx.orderNo}，请协助处理。`
  }
  if (type === 'goods_context' && ctx.goodsName) {
    return `请关注商品「${ctx.goodsName}」，请协助处理。`
  }
  return ''
}

async function loadRecipients() {
  loadingRecipients.value = true
  try {
    recipients.value = await listNotifyRecipients()
    if (recipients.value.length === 1) {
      selectedIds.value = new Set([recipients.value[0].userId])
    }
  } catch (err) {
    showToast({
      title: err instanceof Error ? err.message : '加载失败',
      icon: 'none',
    })
  } finally {
    loadingRecipients.value = false
  }
}

async function submit() {
  const toUserIds = [...selectedIds.value]
  if (!toUserIds.length) {
    showToast({ title: '请选择接收人', icon: 'none' })
    return
  }
  const content = body.value.trim() || buildDefaultBody(notifyType.value, context.value)
  if (!content) {
    showToast({ title: '请填写通知内容', icon: 'none' })
    return
  }

  sending.value = true
  try {
    const sent = await sendBizNotification({
      toUserIds,
      title: title.value.trim(),
      body: content,
      type: notifyType.value,
      context: context.value,
    })
    showToast({ title: `已发送 ${sent} 条`, icon: 'success' })
    navigateBack()
  } catch (err) {
    showToast({
      title: err instanceof Error ? err.message : '发送失败',
      icon: 'none',
    })
  } finally {
    sending.value = false
  }
}

useLoad((options) => {
  const type = String(options?.type || '').trim()
  if (type === 'order' || type === 'order_context') {
    notifyType.value = 'order_context'
    const orderId = String(options?.orderId || '').trim()
    const orderNo = String(options?.orderNo || '').trim()
    context.value = {
      orderId,
      orderNo,
      linkPath: orderId ? `/pagesMerchant/order/detail?id=${orderId}` : '',
    }
    title.value = orderNo ? `订单通知 · ${orderNo}` : '订单通知'
    body.value = buildDefaultBody('order_context', context.value)
  } else if (type === 'goods' || type === 'goods_context') {
    notifyType.value = 'goods_context'
    const goodsId = String(options?.goodsId || '').trim()
    const goodsName = String(options?.goodsName || '').trim()
    context.value = {
      goodsId,
      goodsName,
      linkPath: goodsId ? `/pagesMerchant/goods/edit?id=${goodsId}` : '',
    }
    title.value = goodsName ? `商品通知 · ${goodsName}` : '商品通知'
    body.value = buildDefaultBody('goods_context', context.value)
  }

  void loadRecipients()
})
</script>

<style lang="less">
.page-notify-send {
  min-height: 100vh;
  background: @color-bg-muted;
  padding-bottom: 140rpx;
}

.notify-send-card {
  margin: 16rpx;
  padding: 24rpx;
  background: #fff;
  border-radius: 16rpx;
}

.notify-send-label {
  font-size: 26rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 12rpx;
}

.notify-send-hint {
  font-size: 24rpx;
  color: #888;
}

.notify-send-input {
  width: 100%;
  padding: 16rpx 20rpx;
  margin-bottom: 20rpx;
  box-sizing: border-box;
  background: @color-bg-surface-alt;
  border-radius: 12rpx;
  font-size: 28rpx;
}

.notify-send-textarea {
  width: 100%;
  min-height: 220rpx;
  padding: 16rpx 20rpx;
  box-sizing: border-box;
  background: @color-bg-surface-alt;
  border-radius: 12rpx;
  font-size: 28rpx;
  line-height: 1.6;
}

.recipient-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.recipient-item {
  min-width: 160rpx;
  padding: 16rpx 20rpx;
  border-radius: 12rpx;
  background: @color-bg-surface-alt;
  border: 2rpx solid transparent;

  &.active {
    background: @color-wiki-purple-bg-lighter;
    border-color: @color-merchant-start;
  }
}

.recipient-name {
  font-size: 28rpx;
  color: #222;
}

.recipient-role {
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #888;
}

.notify-send-footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.96);
  border-top: 1rpx solid #eee;
}
</style>
