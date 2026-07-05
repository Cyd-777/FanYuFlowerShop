> ⚠️ **已迁移** → [./页面地图模块-页面流.md](./页面地图模块-页面流.md)。下文保留作对照。

---

# 凡语花店 — 页面思维导图

一阶（一级标题）= 页面，二阶（缩进）= 页面内的交互功能/模态窗。

---

## 顾客端

- **登录页** `pages/login/index`
  - 微信登录按钮
  - 手机号登录按钮
  - 模态：登录失败提示

- **首页** `pages/home/index` (Tab1)
  - 分类入口图标 → 商品列表页
  - 商品卡片列表 → 商品详情页
  - 搜索框 → 搜索页
  - 主题 Banner 轮播

- **商城** `pages/category/index` (Tab2)
  - 商品 Item → 商品详情页
  - 定制花束入口（弹出面板→点击开始定制→定制花束页）
  - 搜索框 → 搜索页

- **百科** `pages/wiki/index` (Tab3)
  - 百科卡片列表 → 百科详情页
  - 搜索框 → 搜索页

- **购物车** `pages/cart/index` (Tab4)
  - 商品项（点击→商品详情页）
  - 加减数量
  - 删除商品
  - 全选 / 取消全选
  - 结算按钮 → 确认订单页
  - 空态：去逛逛 → 首页

- **我的** `pages/mine/index` (Tab5)
  - 用户头像 → 编辑资料页
  - 我的订单入口 → 我的订单页
  - 会员中心入口 → 会员中心页
  - 我的收藏入口 → 我的收藏页
  - 地址管理入口 → 地址管理页
  - Bug 反馈入口 → Bug 反馈页
  - 关于我们入口 → 关于我们页
  - 输入邀请码入口 → 输入邀请码页
  - 商家工作台入口 → 商家工作台

- **商品列表页** `pagesCustomer/goods/list`
  - 商品 Item → 商品详情页

- **商品详情页** `pagesCustomer/goods/detail`
  - 收藏按钮（未登录→登录页）
  - 百科关联入口 → 百科详情页
  - 加入购物车按钮
  - 立即购买按钮 → 确认订单页

- **搜索页** `pagesCustomer/search/index`
  - 商品结果 → 商品详情页
  - 百科结果 → 百科详情页
  - 搜索建议

- **定制花束页** `pagesCustomer/customize/index`
  - 花材选择按钮 → 选择商品页（花材）
  - 包装选择按钮 → 选择商品页（包装）
  - 贺卡选择按钮 → 选择商品页（贺卡）
  - 提交订单按钮 → 订单预览页
  - 提示：请先选择花材和包装

- **选择商品页** `pagesCustomer/customize/pick`
  - 花材 / 包装 / 贺卡列表
  - 确定按钮 → 返回定制花束页

- **订单预览页** `pagesCustomer/customize/preview`
  - 确认下单按钮 → 确认订单页
  - 提示：请先完成定制

- **确认订单页** `pagesCustomer/order/confirm`
  - 收货地址选择 → 地址管理页（选择模式）
  - 备注输入
  - 模态：备注输入框（wx.showModal 可编辑）
  - 提交订单按钮 → 订单详情页

- **我的订单页** `pagesCustomer/order/list`
  - 全部 / 待处理 / 处理中 / 已完成 标签切换
  - 订单卡片 → 订单详情页

- **订单详情页** `pagesCustomer/order/detail`
  - 取消订单按钮
  - 模态：取消订单确认
  - 订单步骤条

- **会员中心页** `pagesCustomer/member/index`
  - 积分明细入口 → 积分明细页
  - 会员等级入口 → 会员等级页
  - 每日签到入口 → 每日签到页

- **积分明细页** `pagesCustomer/member/points`

- **会员等级页** `pagesCustomer/member/level`

- **每日签到页** `pagesCustomer/member/signin`

- **地址管理页** `pagesCustomer/address/list`
  - 地址卡片（点击选择/编辑）
  - 编辑按钮 → 编辑地址页
  - 从微信添加地址
  - 删除按钮
  - 模态：删除地址确认

- **编辑地址页** `pagesCustomer/address/edit`
  - 保存按钮 → 返回
  - 微信导入地址
  - 删除地址按钮
  - 模态：删除地址确认
  - 模态：需要位置权限（wx.showModal）

- **编辑资料页** `pagesCustomer/profile/edit`
  - 保存按钮 → 返回

- **我的收藏页** `pagesCustomer/favorite/index`

- **百科详情页** `pagesCustomer/wiki/detail`

- **专题活动页** `pagesCustomer/theme/index`
  - 商品 Item → 商品详情页

- **关于我们页** `pagesCustomer/other/index`
  - 退出登录按钮 → 登录页

- **商家邀请页** `pages/invite/staff/index`
  - 接受邀请

- **输入邀请码页** `pages/invite/join/index`
  - 邀请码输入框
  - 提交验证

---

## 商家端

- **商家工作台** `pagesMerchant/dashboard/index`
  - 今日订单 / 待处理 / 今日收入 → 订单管理页（对应标签）
  - 订单管理按钮 → 订单管理页
  - 商品管理按钮 → 商品管理页
  - 分类管理按钮 → 分类管理页
  - 扫码核销按钮 → 扫码核销页
  - 人员管理按钮 → 人员管理页
  - 销售策略按钮 → 销售策略页
  - 店铺设置按钮 → 店铺设置页
  - 仓储历史按钮 → 仓储历史页
  - 素材管理按钮 → 素材管理页
  - 预览顾客端 → 首页（Tab 切换）

- **订单管理页** `pagesMerchant/order/list`
  - 全部 / 待接单 / 制作中 / 配送中 / 已完成 / 已取消 标签
  - 订单卡片 → 订单详情页
  - 接单按钮（同页操作）

- **订单详情页** `pagesMerchant/order/detail`
  - 开始制作按钮
  - 模态：确认订单信息
  - 自提已备好按钮
  - 自配送按钮
  - 呼叫骑手按钮
  - 扫码核销按钮
  - 订单步骤状态条

- **商品管理页** `pagesMerchant/goods/list`
  - 商品卡片 → 编辑商品页
  - 新建商品按钮 → 编辑商品页
  - 批量入库按钮 → 批量入库页
  - 批量出库按钮 → 批量出库页
  - 进货单入库按钮 → 进货单入库页
  - 仓储历史按钮 → 仓储历史页
  - 批量上架 / 下架
  - 批量设推荐
  - 批量删除按钮
  - 模态：批量删除确认

- **编辑商品页** `pagesMerchant/goods/edit`
  - 商品名称 / 价格 / 库存 / 描述 输入
  - 选择花卉按钮 → 选择花卉页
  - 素材库选图按钮 → 素材管理页
  - 管理分类按钮 → 分类管理页
  - 保存按钮 → 返回
  - 删除按钮
  - 模态：删除商品确认
  - 上传图片 Loading

- **批量入库页** `pagesMerchant/goods/stock-in`
  - 添加入库项
  - 提交进货单
  - 缺失商品：模态 → 跳转新建商品页

- **批量出库页** `pagesMerchant/goods/stock-out`
  - 添加出库项
  - 提交出库单

- **进货单入库页** `pagesMerchant/goods/stock-in-import`
  - 文字识别输入
  - 生成入库列表 → 批量入库页

- **仓储历史页** `pagesMerchant/goods/warehouse-history`
  - 入库列表
  - 出库列表

- **分类管理页** `pagesMerchant/category/list`
  - 分类项 → 编辑分类页
  - 新建分类按钮 → 编辑分类页
  - 拖拽排序

- **编辑分类页** `pagesMerchant/category/edit`
  - 分类名称输入
  - 分类图标选择
  - 保存按钮 → 返回
  - 删除按钮
  - 模态：删除分类确认

- **选择花卉页** `pagesMerchant/flower/picker`
  - 花卉品种列表
  - 确定选择 → 返回

- **扫码核销页** `pagesMerchant/verify/index`
  - 扫描二维码
  - 核销结果展示

- **人员管理页** `pagesMerchant/staff/index`
  - 生成邀请码
  - 工作人员卡片 → 工作人员详情页

- **工作人员详情页** `pagesMerchant/staff/detail`
  - 姓名 / 手机号 / 角色 编辑
  - 保存按钮 → 返回
  - 移除按钮
  - 模态：移除确认

- **店铺设置页** `pagesMerchant/shop/setting`
  - 店铺名称 / 简介 / 营业时间 编辑
  - 保存按钮 → 返回

- **销售策略页** `pagesMerchant/shop/sales-strategy/index`
  - 主题卡片 → 主题编辑页
  - 切换主题按钮（同页操作）

- **主题编辑页** `pagesMerchant/shop/sales-strategy/edit`
  - 主题名称 / 描述 编辑
  - Banner 素材选择 → 素材管理页
  - 折扣规则添加
  - 折扣商品选择按钮 → 选择折扣商品页
  - 保存策略
  - 上传 Banner Loading

- **选择折扣商品页** `pagesMerchant/shop/goods-picker`
  - 商品列表
  - 确定按钮 → 返回

- **素材管理页** `pagesMerchant/asset/index`
  - 素材卡片（点击选择/重命名）
  - 上传商品图按钮
  - 上传 Banner 按钮
  - 批量删除按钮
  - 模态：删除素材确认
  - 模态：批量删除确认
  - 上传素材 Loading

---

## 全局通用组件

- **AppNavBar** 自定义导航栏
  - 返回按钮
  - 标题显示

- **AppFeedbackHost** 全局反馈层
  - NotifyBar 顶部 / 底部通知条（showToast / showSuccessBar / showWarningBar / showDangerBar）
  - NotifyAlert 居中模态弹窗（showNotifyAlert 确认弹窗）
  - NotifyConfirm 双按钮确认弹窗（showNotifyConfirm）
  - PullRefresh 下拉刷新指示器

- **AppSearchInput** 搜索输入框
  - 搜索历史
  - 搜索建议

- **PickupCodeCard** 自提码卡片

- **OrderStatusSteps** 订单步骤条
