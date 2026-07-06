# 销售策略模块 · API

> **模块入口**：`@/modules/salesStrategy`  
> **分层**：强化（shop 主题子域）  
> **封装状态**：✅（2026-07-06）

---

## 职责与边界

| 做 | 不做 |
|----|------|
| 主题预设（促销配色/副标题/标签）、折扣选品规则 | 店铺基础配置（名称/营业时间 — 见 `@/modules/shop`） |
| 主题启用/装潢保存（经 shop 模块写入） | Banner 上传 / 素材管理（见 `@/modules/asset`） |
| 主题 Preset 类型 & 常量（`ShopThemeId`, `SHOP_THEME_PRESETS`） | 商品本身的价格/库存策略 |

---

## 前端公开 API

```ts
import {
  type ShopThemeId,
  type ShopThemeConfig,
  type ThemeDiscountRule,
  SHOP_THEME_PRESETS,
  getShopThemePreset,
  resolveActiveTheme,
  saveThemeConfig,
  setActiveTheme,
} from '@/modules/salesStrategy'
```

| 函数/常量 | 说明 |
|-----------|------|
| `SHOP_THEME_PRESETS` | 主题预设列表（`ShopThemePreset[]`） |
| `getShopThemePreset(id)` | 按 ID 取预设（默认兜底 `default`） |
| `resolveActiveTheme(settings)` | 从 `ShopSettings` 解析当前生效主题 |
| `saveThemeConfig(themeId, config)` | 保存主题装潢（经 `@/modules/shop`） |
| `setActiveTheme(themeId)` | 切换启用主题 |

### 公开类型

| 类型 | 说明 |
|------|------|
| `ShopThemeId` | `'default' \| 'valentine' \| 'qixi' \| 'women_day' \| 'mother_day' \| 'christmas'` |
| `ShopThemeConfig` | 配色、Banner、折扣规则 |
| `ThemeDiscountRule` | 折扣率 + 适用商品 ID 列表 |

---

## 无独立云函数

本模块不直连云函数；写操作经 `@/modules/shop` → 云 `shop`（`saveThemeConfig` / `setActiveTheme`）。

---

## 依赖模块

| 依赖 | 用途 |
|------|------|
| `@/modules/shop` | 主题保存 + 启用 |
| `@/types/shopTheme` | 预设类型与常量 |

---

## 调用方清单

| 路径 | API |
|------|-----|
| `pagesMerchant/shop/sales-strategy/index.vue` | `SHOP_THEME_PRESETS`, `resolveActiveTheme`, `ShopThemeId` |
| `pagesMerchant/shop/sales-strategy/edit.vue` | `getShopThemePreset`, `ThemeDiscountRule`, `ShopThemeConfig` |

---

## 目录结构

```text
src/modules/salesStrategy/
  api.ts
  index.ts
```

---

## 变更记录

| 日期 | 摘要 |
|------|------|
| 2026-07-06 | 初版封装；主题预设/类型/shop 写操作聚合 |
