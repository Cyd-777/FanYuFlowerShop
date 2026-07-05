/**
 * 布局调试底色。修改后请重新编译（微信开发者工具点「编译」）；watch 有时不会热更新本文件。
 * 项目完成后删除本文件及相关引用。
 */
export const layoutDebugConfig = {
  /**
   * 布局调试底色总开关。
   *
   * true 时以下区域显示半透明底色（见各色值）：
   * - AppNavBar：返回区 `navBackBg`、标题区 `navTitleBg`
   * - 仓储历史时间轴（接入后）：时间格 `timelineTimeCellBg`、轴线 `timelineAxisCellBg`
   * - 商城分类 ScrollAnchorNav 一阶：左侧 tab 栏 / scroll 外层 / scroll 内容区
   * - 商城分类 ScrollAnchorNav 二阶：分区内壳 / 胶囊浮层 / 胶囊顶留白 / 分区内容
   */
  showLayoutDebugBg: false,
  // showLayoutDebugBg: true,

  navBackBg: '#ffe8e8',
  navTitleBg: '#e8f0ff',

  timelineTimeCellBg: '#fff3e0',
  timelineAxisCellBg: 'rgba(255, 0, 0, 0.12)',

  scrollAnchorL1TabRailBg: 'rgba(255, 182, 193, 0.35)',
  scrollAnchorL1ScrollBg: 'rgba(173, 216, 230, 0.25)',
  scrollAnchorL1ContentBg: 'rgba(144, 238, 144, 0.2)',
  scrollAnchorL2SectionBg: 'rgba(255, 228, 196, 0.45)',
  scrollAnchorL2PillBg: 'rgba(221, 160, 221, 0.4)',
  scrollAnchorL2PillSpacerBg: 'rgba(186, 85, 211, 0.28)',
  scrollAnchorL2ContentBg: 'rgba(255, 255, 224, 0.35)',

  /**
   * 智库词条详情：模型字段下划线 + 极小来源 tag（可单独开，不必开 showLayoutDebugBg）。
   * 改完须重新编译。
   */
  showWikiDataSourceLabels: false,
  // showWikiDataSourceLabels: true,
} as const
