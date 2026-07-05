> **所属**：[导航与图标模块](./导航与图标模块.md)  
> **状态**：已迁入


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
