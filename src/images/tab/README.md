# Tab 图标

## 消息态「我的」Tab — 铃兰

有未读业务通知时，「我的」Tab 会切换为消息态 icon：

| 文件 | 说明 |
|------|------|
| `mine-notify.png` | 默认态 |
| `mine-notify-active.png` | 选中态 |

**设计目标**：**铃兰花朵**造型（品牌识别，与默认「我的」人形区分）。

- 尺寸：81×81 px（与现有 Tab icon 一致）
- 当前：`scripts/generate-tab-icons.js` 内 `drawMineNotify` 为**程序绘制铃兰**（弯曲花茎 + 串铃）；可换设计稿 PNG 覆盖
- 替换方式：将设计稿 PNG 直接覆盖上述两个文件，或更新脚本后 `npm run generate:tab-icons`
- 引用：`src/utils/notifyTabBadge.ts`
