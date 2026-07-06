# 会员体系模块 · API

> **模块入口**：`@/modules/member`  
> **分层**：附加  
> **云函数**：无（0.3.0 目标版本；当前为本地 mock 实现）  
> **封装状态**：✅（2026-07-06；API 形状定案，待 0.3.0 替换实现）

---

## 职责与边界

| 做 | 不做 |
|----|------|
| 会员等级定义与计算（积分 → 等级映射） | 等级/积分数据持久化（待 0.3.0 接入云函数） |
| 等级名、花语、折扣、权益文案 | 签到/积分流水 UI 与交互（见会员中心子页） |
| 等级晋升进度计算 | 优惠券发放（依赖会员身份，但属优惠券模块职责） |

---

## 前端公开 API

```ts
import {
  type MemberLevel,
  type MemberLevelId,
  MEMBER_LEVELS,
  MEMBER_LEVEL_BENEFITS,
  resolveMemberLevel,
  calcLevelProgress,
} from '@/modules/member'
```

| 函数/常量 | 说明 |
|-----------|------|
| `MEMBER_LEVELS` | 等级配置列表（5 级：雏菊→康乃馨→郁金香→玫瑰→牡丹） |
| `MEMBER_LEVEL_BENEFITS` | 权益文案列表 |
| `resolveMemberLevel(points)` | 积分 → 当前等级 |
| `resolveMemberLevelIndex(points)` | 积分 → 等级序号（0-based） |
| `calcLevelProgress(points)` | 当前等级进度（含 nextLevel, progress） |
| `formatMemberDiscount(discount)` | 折扣数值 → 展示文案 |

### 公开类型

| 类型 | 说明 |
|------|------|
| `MemberLevelId` | `'daisy' \| 'carnation' \| 'tulip' \| 'rose' \| 'peony'` |
| `MemberLevel` | `{ id, name, flower, icon, minPoints, discount, tagline }` |

---

## 无独立云函数

云端实现待 0.3.0 排期。当前等级/签到期硬编码为 mock，客户端直读模块内常量。

---

## 依赖模块

无（所有数据为本地常量）。

---

## 调用方清单

| 路径 | API |
|------|-----|
| `pagesCustomer/member/index.vue` | `calcLevelProgress` |
| `pagesCustomer/member/level.vue` | `MemberLevel`, `MEMBER_LEVELS` |

---

## 目录结构

```text
src/modules/member/
  api.ts
  index.ts
```

---

## 变更记录

| 日期 | 摘要 |
|------|------|
| 2026-07-06 | 初版 API 形状定案（mock 实现）；待 0.3.0 替换 |
