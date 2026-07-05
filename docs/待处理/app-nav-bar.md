> ⚠️ **已迁移** → [./导航与图标模块-AppNavBar.md](./导航与图标模块-AppNavBar.md)。下文保留作对照。

---


# 自定义 Head（AppNavBar）API

小程序在 `app.config.ts` 中设置了 `navigationStyle: 'custom'`，系统导航栏已关闭。顶栏由 **`AppNavBar`** 组件 + **`pageNav` 路由配置** + **`navBarLayout` 尺寸工具** 共同完成。

---

## 1. 两种模式

| 模式 | 值 | 文档流占位 | 典型场景 |
|------|-----|------------|----------|
| 虚化透明浮层 | `overlay` | **无**（Head 不撑开页面高度） | Tab 页 |
| 有高度体积 | `spacer` | **有**（`placeholder` 高度 = Head 总高） | 子页、登录页等 |

```
overlay                           spacer
┌─ fixed 顶栏（浮在内容上）        ┌─ fixed 顶栏
│  transparent / blur              ├─ placeholder（占位块）
├─ 页面需自行 padding-top          │  正文从这里开始
│  正文                            │  …
```

**默认规则**（`resolvePageNav`）：

- 路由在 `TAB_BAR_ROUTES` 内 → `overlay`
- 其余路由 → `spacer`
- 未在 `PAGE_NAV` 中登记的子页 → `spacer` + `background: 'white'`

---

## 2. 组件 `AppNavBar`

**路径**：`src/components/AppNavBar.vue`

**用法**：放在页面根节点**第一个子元素**；无 props 时自动读当前路由配置。

返回按钮图标见 **§11 `AppIcon`**（`type="返回"`）。

```vue
<template>
  <view class="page-xxx">
    <AppNavBar />
    <!-- 页面正文 -->
  </view>
</template>
```

### Props

| 属性 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `title` | `string` | 来自 `pageNav` | 居中标题；空字符串则不显示 |
| `hideBack` | `boolean` | `false` | 设为 `true` 时隐藏返回；不传则按路由自动判断 |
| `mode` | `'overlay' \| 'spacer'` | 来自 `pageNav` | 见 §1 |
| `background` | `'transparent' \| 'blur' \| 'white'` | 来自 `pageNav` | 顶栏背景样式 |

### `background` 视觉效果

| 值 | 效果 |
|----|------|
| `transparent` | 完全透明 |
| `blur` | 半透明白 + `backdrop-filter: blur(16px)` |
| `white` | 不透明白底；`spacer` 模式下带底部分割线 |

### 覆盖示例

```vue
<AppNavBar title="临时标题" mode="spacer" background="blur" />
```

### 层级（z-index）

| 元素 | z-index |
|------|---------|
| `AppNavBar` 固定顶栏 | 100 |
| 搜索框吸顶（`AppSearchInput` sticky） | 120 |
| 搜索聚焦遮罩 | 200 |

---

## 3. 路由配置 `pageNav`

**路径**：`src/config/pageNav.ts`

新增或修改页面时，在 `PAGE_NAV` 中登记：

```typescript
'pagesCustomer/foo/index': {
  title: '页面标题',
  mode: 'spacer',           // 可选；子页可省略
  background: 'white',      // 可选
  showBack: true,           // 可选；子页默认 true
},
```

### 导出

| 符号 | 说明 |
|------|------|
| `TAB_BAR_ROUTES` | Tab 路由集合（5 个主包 Tab） |
| `PAGE_NAV` | 路由 → 配置表 |
| `resolvePageNav(route)` | 合并默认值，返回完整配置（含 `mode`） |
| `getCurrentPageRoute()` | 当前页 route，如 `pages/home/index` |
| `isTabBarRoute(route)` | 是否 Tab 页 |

### 类型

```typescript
type NavBarMode = 'overlay' | 'spacer'
type NavBarBackground = 'transparent' | 'blur' | 'white'

interface PageNavConfig {
  title?: string
  mode?: NavBarMode
  showBack?: boolean
  background?: NavBarBackground
}
```

### 当前 Tab 页预设

| 路由 | mode | background | title |
|------|------|------------|-------|
| `pages/home/index` | overlay | transparent | （无，渐变头自绘） |
| `pages/category/index` | overlay | blur | 商城 |
| `pages/wiki/index` | overlay | transparent | （无，页内大标题） |
| `pages/cart/index` | overlay | blur | 购物车 |
| `pages/mine/index` | overlay | blur | 我的 |

---

## 4. 尺寸工具 `navBarLayout`

**路径**：`src/utils/navBarLayout.ts`

### 高度公式

```
statusBarHeight   = getWindowInfo().statusBarHeight
capsuleTop        = getMenuButtonBoundingClientRect().top   // 胶囊距顶
capsuleWidth      = getMenuButtonBoundingClientRect().width
capsuleHeight     = getMenuButtonBoundingClientRect().height

totalHeight       = statusBarHeight + (capsuleTop − statusBarHeight) × 2 + capsuleHeight
navContentHeight  = (capsuleTop − statusBarHeight) × 2 + capsuleHeight
```

数据来源：

- `Taro.getWindowInfo().statusBarHeight` — 状态栏高度
- `Taro.getMenuButtonBoundingClientRect()` — 微信胶囊（距顶、宽、高）

同一次小程序会话内结果**缓存**，一般无需重复计算。

### `NavBarLayout` 字段

| 字段 | 单位 | 说明 |
|------|------|------|
| `statusBarHeight` | px | 状态栏高度 |
| `capsuleTop` | px | 胶囊距屏幕顶部 |
| `capsuleWidth` | px | 胶囊宽度 |
| `capsuleHeight` | px | 胶囊高度 |
| `capsuleTopGap` | px | `capsuleTop − statusBarHeight` |
| `navContentHeight` | px | 导航内容区（标题行） |
| `totalHeight` | px | Head 总高（占位 / sticky 用这个） |
| `capsuleRight` | px | 胶囊距屏幕右缘 |
| `windowWidth` | px | 窗口宽度 |
| `menuButtonWidth` / `menuButtonTop` / `menuButtonRight` | px | 已废弃别名，请用 `capsule*` |

### 函数

| 函数 | 说明 |
|------|------|
| `getNavBarLayout(force?)` | 返回布局对象；`force: true` 强制重算 |
| `getHeadLayout` | `getNavBarLayout` 别名 |
| `navBarCssVars(layout?)` | 返回 CSS 变量对象，供 `:style` 绑定 |
| `headCssVars` | `navBarCssVars` 别名 |

### CSS 变量

| 变量 | 含义 |
|------|------|
| `--nav-status-bar-height` | 状态栏高度 |
| `--nav-capsule-top` | 胶囊距顶 |
| `--nav-capsule-width` | 胶囊宽度 |
| `--nav-capsule-height` | 胶囊高度 |
| `--nav-capsule-top-gap` | 胶囊上间距 |
| `--nav-bar-height` | 导航内容区 |
| `--nav-total-height` | Head 总高 |

---

## 5. Composable `useNavBarLayout`

**路径**：`src/composables/useNavBarLayout.ts`  
**别名**：`useHeadLayout`

```typescript
const {
  layout,           // ComputedRef<NavBarLayout>
  cssVars,          // ComputedRef<Record<string, string>>，绑定到页面根 :style
  totalHeightPx,    // 如 "88px"，供 sticky-top 等
  statusBarHeightPx,
  navBarHeightPx,
} = useNavBarLayout()
```

---

## 6. 页面接入模式

### A. 子页（`spacer`，默认）

只需 `<AppNavBar />`，占位块自动把正文顶到系统 Head 原位置。

```vue
<template>
  <view class="page-detail">
    <AppNavBar />
    <!-- 正文 -->
  </view>
</template>
```

### B. Tab 页（`overlay`）

Head 不占高度，页面根节点需注入 CSS 变量并留出安全区：

```vue
<template>
  <view class="page-cart page-nav-overlay-safe" :style="navCssVars">
    <AppNavBar />
    <!-- 正文 -->
  </view>
</template>

<script setup lang="ts">
import { useNavBarLayout } from '@/composables/useNavBarLayout'
const { cssVars: navCssVars } = useNavBarLayout()
</script>

<style lang="less">
@import '@/styles/tokens.less';
</style>
```

**工具 class**（定义于 `src/styles/tokens.less`）：

```less
.page-nav-overlay-safe {
  padding-top: var(--nav-total-height, 0px);
}
```

### C. 首页（`overlay` + 渐变透顶）

不使用 `.page-nav-overlay-safe`，由渐变头自行 padding：

```vue
<view class="page-home" :style="navCssVars">
  <AppNavBar />
  <view class="header" :style="headerStyle">…</view>
  <AppSearchInput :sticky-top="totalHeightPx" … />
</view>
```

```less
.header {
  padding-top: calc(var(--nav-total-height) + 24rpx);
}
```

### D. 页内吸顶元素

`spacer` 页内一般 `sticky-top: 0` 即可（占位已在上方）。  
`overlay` 页或全页滚动时，吸顶应避开浮层 Head：

```less
.my-sticky-bar {
  top: var(--nav-total-height, 0px);
}
```

或在 props 中：`:sticky-top="totalHeightPx"`（见首页搜索框）。

**示例**：商家商品列表工具栏（`pagesMerchant/goods/list.vue`）根节点 `:style="navCssVars"`，`.toolbar { top: var(--nav-total-height); }`。

---

## 7. 新页面 Checklist

1. `app.config.ts` / 分包配置中注册页面路径  
2. 页面 `*.vue` 顶部添加 `<AppNavBar />`  
3. 在 `PAGE_NAV` 填写 `title`；Tab 页无需写 `mode`（自动 overlay）  
4. **Tab / overlay 页**：根节点加 `page-nav-overlay-safe` + `navCssVars`（首页等特殊布局除外）  
5. 有吸顶条 / 搜索框：确认 `sticky-top` 或 CSS `top` 是否需 `--nav-total-height`  
6. 分类等依赖锚点高度的布局：占位变更后真机看一眼分栏区域是否对齐  

---

## 8. 布局调试开关

**路径**：`src/config/layoutDebug.ts`（与 `src/config/login.ts` 同模式；项目完成后整文件删除）

```typescript
export const layoutDebugConfig = {
  showNavLayoutDebugBg: false,  // 改为 true 显示区域底色
  backBg: '#ffe8e8',
  titleBg: '#e8f0ff',
}
```

修改后请**重新编译**；仅保存文件时 watch 有时不会更新本配置。

---

## 9. 全局开关

**路径**：`src/app.config.ts`

```typescript
window: {
  navigationStyle: 'custom',
  // navigationBarTitleText 等仍保留，作编译兜底；运行时由 AppNavBar 接管
}
```

---

## 10. 相关文件索引

| 文件 | 职责 |
|------|------|
| `src/components/AppNavBar.vue` | Head 组件 |
| `src/config/pageNav.ts` | 路由级默认配置 |
| `src/utils/navBarLayout.ts` | 设备尺寸与 CSS 变量 |
| `src/composables/useNavBarLayout.ts` | 页面 composable |
| `src/styles/tokens.less` | `.page-nav-overlay-safe` |
| `src/config/layoutDebug.ts` | Head 布局调试底色开关 |
| `src/app.config.ts` | 关闭系统导航栏 |
| `src/components/AppIcon.vue` | base64 图标组件（见 §11） |
| `src/assets/icons/index.ts` | 图标注册表 `APP_ICONS` |
| `src/components/NavBackIcon.vue` | 兼容包装，等价 `<AppIcon type="返回" />` |

---

## 11. 图标 `AppIcon`（base64 PNG）

Head 内小图标（如返回箭头）不走 Tab 图标那套静态资源路径，而是用 **base64 编码的 PNG** 内联到代码里，经统一组件引用。

### 为什么用 base64

- 自定义 Head 下图标需与胶囊、标题行精确对齐，尺寸可控（默认 **24px**）
- 内联后无需额外请求、不依赖 `dist/` 拷贝路径，分包页面也能直接用
- 与 TabBar 大图标的 `images/` 源文件策略分离：Tab 走构建脚本同步，Head 小图标走注册表

### 组件 `AppIcon`

**路径**：`src/components/AppIcon.vue`

```vue
<AppIcon type="返回" :size="24" />
```

| 属性 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `type` | `AppIconType` | （必填） | 图标名称，**中文**，与注册表键名一致 |
| `size` | `number` | `24` | 图标边长（px）；渲染为 `<image>` 的宽高 |

`type` 有 TypeScript 提示；传未注册的名称会在编译期报错。

### 注册表

**路径**：`src/assets/icons/index.ts`

```typescript
export const APP_ICONS = {
  返回: 'data:image/png;base64,...',
} as const

export type AppIconType = keyof typeof APP_ICONS

export function getAppIconSrc(type: AppIconType): string
```

| 符号 | 说明 |
|------|------|
| `APP_ICONS` | 中文名 → `data:image/png;base64,...` |
| `AppIconType` | 合法 `type` 联合类型 |
| `getAppIconSrc(type)` | 按名称取 src，供非组件场景使用 |

### 当前已注册图标

| `type` | 用途 |
|--------|------|
| `返回` | `AppNavBar` 返回按钮 |

### 新增图标

1. 准备 PNG 源图（建议透明底、@2x/@3x 导出后转 base64）
2. 在 `APP_ICONS` 增加一条 **中文键** 与 base64 字符串
3. 页面或组件中 `<AppIcon type="你的中文名" />`

键名用简短中文（如 `关闭`、`搜索`），避免英文或与路由混淆。

### 与 `AppNavBar` 的关系

`AppNavBar` 返回区使用：

```vue
<AppIcon type="返回" :size="24" />
```

### 兼容组件 `NavBackIcon`

**路径**：`src/components/NavBackIcon.vue`

仅包装 `<AppIcon type="返回" />`，保留旧引用。新代码请直接用 `AppIcon`。

`src/assets/icons/navBackIcon.ts` 已标记 `@deprecated`，请改用 `@/assets/icons` 或 `AppIcon`。
