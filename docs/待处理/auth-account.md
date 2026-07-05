> ⚠️ **已迁移** → [./身份与登录模块.md](./身份与登录模块.md)。下文保留作对照。

---

# 多端账号与登录

## 当前阶段（0.2.0）

- **登录（默认）**：**微信一键登录**（小程序 openid）
- **手机号验证码登录**：前后端已实现；登录页由 `src/config/login.ts` 中 **`ENABLE_PHONE_LOGIN`** 控制是否显示 UI（当前 `false`）。接入短信后改为 `true` 即可，无需重写逻辑
- **资料完善**：登录后在「我的」进入 **编辑资料** 页，选头像、填昵称，保存至云端

## 测试店长 OpenID

以下 OpenID 在 `login` 与各商家云函数白名单中保留，用于 B 端测试：

- `oiDICxmmuGHJTKQzDsG9X32n2fAs`

其它微信登录默认为 **顾客**。人员也可通过 `merchants` 集合授予商家权限。

## 数据模型

### `users`（主账号）

| 字段 | 说明 |
|------|------|
| `userId` | 业务主键，如 `u_1730_abc123` |
| `nickName` | 展示昵称，默认 `花友xxxx` |
| `avatarUrl` | 头像，云存储 `cloud://` 或 HTTPS |
| `phone` | 账号绑定手机，**非必填** |

### `user_auth`（登录绑定）

| 字段 | 说明 |
|------|------|
| `userId` | 关联 `users.userId` |
| `authType` | `wechat_mp`（当前使用）\| `phone`（预留） |
| `identifier` | openid 或 11 位手机号 |

### `sms_codes`（手机号登录）

验证码暂存；开发期云函数返回 `devCode` 显示在登录页。正式环境需接短信服务商。

## 登录与资料（云函数 `login`）

| 场景 | action | 前端 |
|------|--------|------|
| 微信一键登录 | `loginWechat` | 始终显示 |
| 发送验证码 | `sendSmsCode` | `ENABLE_PHONE_LOGIN` 为 true 时 |
| 手机号登录 | `loginPhone` | 同上 |
| 权限校验 | `checkAccess` | 启动 / 进商家页 |
| 读资料 | `getProfile` | 「我的」展示 / 编辑资料页 |
| 存资料 | `saveProfile` | `pagesCustomer/profile/edit` |

头像上传：临时路径 → `uploadFile` 至 `avatars/` → `saveProfile`。

## 启用手机号登录

1. 在 `src/config/login.ts` 将 `ENABLE_PHONE_LOGIN` 改为 `true`
2. 正式环境在云函数 `login` 接入短信发送（替换仅返回 `devCode` 的开发逻辑）
3. 重新编译小程序

## 客户端 Session

本地存储（**不含 openid**）：

- `user_id` — 业务 userId；`hasToken()` 以此判断「已登录」
- `user_info` — 昵称、头像等
- `user_role` / `user_access_epoch`

鉴权由云函数 `getWXContext().OPENID` 完成，客户端不传 openid。

身份码 QR 内容为 `fanuy:identity:{userId}`，非 openid 明文。

## 与收货地址手机号的区别

- `users.phone`：账号绑定（预留）
- 收货地址手机号：下单联系用，在地址页填写

## 部署

```bash
npm run sync:cloud
npm run deploy:cloud -- --only login,staff
```

## 安全加固（规划）

登录与 OpenID 存储的**目标态、分阶段改造、待拍板项**见 [auth-security-plan.md](./auth-security-plan.md)（未开工）。
