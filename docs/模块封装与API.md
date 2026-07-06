# 模块封装与 API

> **状态**：进行中 · **检查点**：`feat/closed-loop` @ `4eac500`（2026-07-06 已推送 GitHub）  
> **目标**：各功能模块**仅通过公开 API** 对外暴露能力；模块之间**禁止**跨模块深 import，实现可替换、可文档化、可逐模块演进。

---

## 原则

| 规则 | 说明 |
|------|------|
| **单一入口** | 其它模块 / 页面只 `import` 自 `@/modules/{模块名}` 或 `@/modules/{模块名}/api` |
| **内部私有** | 实现放在 `client.ts`、`internal/`；不对外 export |
| **云侧对称** | 每个前端模块对应云函数 `action` 清单，写入该模块 `*-API.md` |
| **类型随 API** | 公开类型从 `api.ts`（或 `types.ts` 并由 api 再导出）暴露，不引内部路径 |
| **闭环后移** | **基础闭环**（商品/订单/购物车等）本轮不改行为，只登记边界；先封 **强化** 与 **非闭环附加** |
| **逐模块交付** | 每模块：封装 → 改调用方 → 写 API 文档 → 你验收 → 再下一个 |

---

## 目录约定

```text
src/modules/{name}/
  api.ts      # 公开接口（唯一对外契约）
  types.ts    # 公开类型（可选，由 api 再导出）
  client.ts   # 云函数调用等实现（模块内私有）
  index.ts    # 仅 re-export api

docs/{模块名}模块-API.md   # 该模块 API 文档（前端 + 云 action）
```

过渡期：`src/services/{name}.ts` 可保留为 `export * from '@/modules/{name}'` 兼容层，新代码禁止写 services。

---

## 执行顺序

### 波次登记（实际顺序见 [升级策略](./模块封装-升级策略.md) §3）

| 序 | 模块 | 前端入口 | 波次 | 状态 |
|----|------|----------|------|------|
| 1 | 人员管理 | `@/modules/staff` | 0 | ✅ |
| 2 | 类 OA | `@/modules/notify` | 1 · 迭代1 | ✅ |
| 3 | 收藏 | `@/modules/favorite` | 1 · 迭代1 | ✅ |
| 4 | 会员 | `@/modules/member` | 1 | 待做 |
| 5 | 启动授权 | `@/modules/auth` | 1 · 迭代2 | ✅ |
| 6 | 店铺设置 | `@/modules/shop` | 2 · 迭代2 | ✅ 读 API |
| 7 | 销售策略 | `@/modules/salesStrategy` | 2 | 待做（在 shop 后） |
| 8 | 素材 | `@/modules/asset` | 2 | 待做 |
| 9 | 搜索 | `@/modules/search` | 3 · 迭代3 | ✅ |
| 10 | 花卉目录读 | `@/modules/flower` | 3 · 迭代3 | ✅ |
| 11 | 智库读/写 | `@/modules/wiki` | 4 | 待做 |
| 12 | 分类 | `@/modules/category` | 4 | 待做 |
| 13 | 可售数进货 | `@/modules/warehouse` | 5 | 待做 |
| 14+ | 商品/订单/购物车等 | — | 6 · 最后 | 登记 |

**不在本轮封装（基础闭环核）**：首页、商城、商品、购物车、订单、地址、自选花束——待波次 6 收口。

---

### 阶段 A · 强化（优先）

| 序 | 模块 | 前端入口 | 云函数 | API 文档 | 封装状态 |
|----|------|----------|--------|----------|----------|
| 1 | 人员管理 | `@/modules/staff` | `staff` | [人员管理模块-API](./人员管理模块-API.md) | ✅ |
| 2 | 销售策略 | `@/modules/salesStrategy` | `shop`（主题相关 action） | 待写 | 未开始 |
| 3 | 店铺设置 | `@/modules/shop` | `shop` | [店铺设置模块-API](./店铺设置模块-API.md) | ✅ 读 API |
| 4 | 素材管理 | `@/modules/asset` | `goods`（media） | 待写 | 未开始 |
| 5 | 可售数与进货 | `@/modules/warehouse` | `goods`（inventory） | 待写 | 未开始 |
| 6 | 分类管理 | `@/modules/category` | `category` | 待写 | 未开始（与智库读路径有耦合，放强化末） |

### 阶段 B · 附加 / 非基础闭环

| 序 | 模块 | 前端入口 | 云函数 | 备注 |
|----|------|----------|--------|------|
| 7 | 类 OA 通知 | `@/modules/notify` | `notify` + `bizNotifyEmit` | ✅ [API](./类OA通知模块-API.md) |
| 8 | 搜索 | `@/modules/search` | `goods` / `wiki` | 统一搜索 facade |
| 9 | 智库 | `@/modules/wiki` | `wiki` | 维护侧暂停；读路径保留 |
| 10 | 会员体系 | `@/modules/member` | 待梳理 | |
| 11 | 收藏 | `@/modules/favorite` | `favorite` | ✅ [API](./收藏模块-API.md) |
| 12 | 启动与授权 | `@/modules/auth` | `login` | ✅ [API](./启动与授权模块-API.md) |

**不在本轮封装（基础闭环核）**：首页、商城、商品、购物车、订单、地址、自选花束、商家工作台订单/商品主路径——仅登记依赖，待强化/附加封完后再收口。

---

## API 文档模板

每个 `docs/{模块}模块-API.md` 须包含：

1. **模块职责** — 一句话 + 边界（做什么 / 不做什么）
2. **前端公开 API** — 函数签名、参数、返回值、错误
3. **公开类型** — TypeScript 类型表
4. **云函数 action** — action 名、入参、出参、鉴权
5. **依赖模块** — 允许调用的其它 `@/modules/*`（应尽量少）
6. **调用方清单** — 页面 / store / 其它模块（便于回归）
7. **变更记录** — 日期 + 摘要

---

## 相关文档

- [架构耦合内聚优化](./架构耦合内聚优化.md) — 已落地的横切解耦（merchantGate、缓存矩阵、bizNotifyEmit）
- [应用架构模块](./应用架构模块.md) — 主包/分包、组件规范
- [docs/README.md](./README.md) — 功能模块分层（业务 / 强化 / 附加）
