# 店铺设置模块 · API

> **模块入口**：`@/modules/shop`  
> **云函数**：`shop`  
> **分层**：强化  
> **封装状态**：✅ 读 API · 迭代 2（2026-07-06）；写 API 待后续迭代

---

## 职责与边界

| 做 | 不做 |
|----|------|
| 读取店铺配置（名称、营业时间、装潢主题、Banner URL） | 写配置（`update` / `saveThemeConfig` / `setActiveTheme` — 已收入 `@/modules/shop`） |
| SWR 缓存读取 `fetchShopSettingsCached` | 销售策略独立模块（待 `@/modules/salesStrategy`） |
| 类型再导出 `ShopSettings` 等 | 商品、订单业务 |

---

## 前端公开 API（读）

```ts
import {
  fetchShopSettings,
  fetchShopSettingsCached,
  type ShopSettings,
} from '@/modules/shop'
```

| 函数 | 参数 | 返回 | 说明 |
|------|------|------|------|
| `fetchShopSettings()` | — | `ShopSettings` | 直连云 `get` |
| `fetchShopSettingsCached(options?)` | `force?`, `onUpdate?` | `LoadWithCacheResult<ShopSettings>` | 模块 `shop` 缓存 + SWR |

### 写 API

| 函数 | 参数 | 返回 | 说明 |
|------|------|------|------|
| `saveShopSettings(settings)` | `ShopSettings` | `ShopSettings` | 云 `update` + 失效 `shopSettings` 缓存 |
| `saveThemeConfig(themeId, config)` | `ShopThemeId`, `ShopThemeConfig` | `ShopSettings` | 保存主题装潢 |
| `setActiveTheme(themeId)` | `ShopThemeId` | `ShopSettings` | 切换启用主题 |

### 公开类型

自 `@/modules/shop` 再导出：`ShopSettings`、`ShopDecoration`、`ShopThemeConfig`、`ThemeDiscountRule`。  
完整定义见 `@/types/shop`、`@/types/shopTheme`。

---

## 写 API（过渡期，非公开面）

以下仍经 `services/shop.ts`（deprecated），供 `stores/shop` 商家编辑页使用：

| 函数 | 云 action |
|------|-----------|
| `saveShopSettings(settings)` | `update` |
| `saveThemeConfig(themeId, config)` | `saveThemeConfig` |
| `setActiveTheme(themeId)` | `setActiveTheme` |

后续迭代将收入 `@/modules/shop` 或拆至 `@/modules/salesStrategy`。

---

## 云函数 `shop` · action（读）

| action | 鉴权 | 入参 | 成功出参 |
|--------|------|------|----------|
| `get` | — | — | `settings: ShopSettings`（含解析后 `bannerImageUrl(s)`） |

写 action 见上表；鉴权：`common/merchantGate.js`（B 端写操作）。

缓存失效：`shopSettings` 事件 → `common/cacheInvalidation.js`。

---

## 依赖模块

| 依赖 | 用途 |
|------|------|
| `@/services/cloud` | 云调用 |
| `@/utils/cache` | `loadWithCache`、失效矩阵 |
| `@/types/shop` | 配置类型 |

---

## 调用方清单

| 路径 | API |
|------|-----|
| `data/repository/shopRepository.ts` | `fetchShopSettingsCached` |
| `stores/shop.ts` | 读经 repository；写经 `services/shop` |
| 首页 / 商城（经 store hydrate） | 间接 |

---

## 目录结构

```text
src/modules/shop/
  api.ts       ← 仅读 API
  client.ts    ← 云调用（含写，写未从 api 导出）
  index.ts
```

---

## 变更记录

| 日期 | 摘要 |
|------|------|
| 2026-07-06 | 迭代 2 读 API 封装；`shopRepository` 改引 `@/modules/shop` |
