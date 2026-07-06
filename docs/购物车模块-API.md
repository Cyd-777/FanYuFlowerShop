# 购物车模块 · API

> **模块入口**：`@/modules/cart`  
> **封装状态**：✅ 波次 6（2026-07-06）

购物车同步（商品上下架/库存变化时自动调整）、加购验证、商品数据刷新。

## 前端公开 API

```ts
import { syncCartWithServer, fetchGoodsForCartIncrease, addGoodsToCart } from '@/modules/cart'
```
