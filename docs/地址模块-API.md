# 地址模块 · API

> **模块入口**：`@/modules/address`  
> **云函数**：`address`（`list` / `replaceAll`）  
> **封装状态**：✅ 波次 6（2026-07-06）

地址 CRUD（本地存储 + 云端同步）；不可编辑时包含列表排序、结账地址选择、微信地址导入。

## 前端公开 API

```ts
import {
  listAddresses, getAddress, getDefaultAddress, getCheckoutAddress,
  saveAddress, removeAddress, setCheckoutAddress,
  hydrateAddressesFromCloud, syncAddressesToCloud,
  importWechatAddressAndSave, wechatAddressToForm,
  formatAddressLine, validateAddressForm, toOrderAddressSnapshot,
  addressFingerprint, toAddressForm, createNewAddressForm,
} from '@/modules/address'
```
