/** 养护图示汇总页 · 条目类型（左侧小图标 / 占位） */
export type WikiCareCatalogVisual =
  | 'trim-angle'
  | 'trim-position'
  | 'water-standard'
  | 'water-shallow'
  | 'emoji'
  | 'placeholder'

export interface WikiCareCatalogItem {
  id: string
  title: string
  description: string
  detail?: string
  visual: WikiCareCatalogVisual
  /** visual === 'emoji' 时使用 */
  icon?: string
  /** visual === 'trim-angle' 时可选角度 */
  angle?: number
}

export interface WikiCareCatalogSection {
  id: string
  title: string
  subtitle?: string
  items: WikiCareCatalogItem[]
}

export const WIKI_CARE_CATALOG: WikiCareCatalogSection[] = [
  {
    id: 'trim-method',
    title: '剪根 / 修剪',
    subtitle: '对应 careVase.trim + trimPosition；顾客端合并为一张修剪图',
    items: [
      {
        id: 'trim-oblique-45',
        title: '斜剪 45°',
        description: '最常用：增大吸水截面，切口新鲜。',
        detail: '多数鲜切花默认；玫瑰、百合、康乃馨等。',
        visual: 'trim-angle',
        angle: 45,
      },
      {
        id: 'trim-oblique-length',
        title: '斜剪定长',
        description: '斜剪并修去 2—3 cm 旧茎，换水时可重复。',
        detail: '例：郁金香「斜剪花茎 2—3 cm 增加吸水」。',
        visual: 'trim-angle',
        angle: 45,
      },
      {
        id: 'trim-cross',
        title: '十字剪 / 劈茎',
        description: '茎部吸水困难时，十字或一字劈茎增吸水。',
        detail: '例：绣球；角度图仍按斜剪示意，实际以 tips 为准。',
        visual: 'emoji',
        icon: '✂️',
      },
      {
        id: 'trim-leaf',
        title: '斜剪 + 去叶',
        description: '修根同时去掉多余叶片，减少腐烂。',
        detail: '例：洋牡丹「斜剪并去除多余叶片」。',
        visual: 'trim-angle',
        angle: 45,
      },
      {
        id: 'trim-scald',
        title: '烫茎',
        description: '极短时间在热水中烫切口，促吸水（慎用）。',
        detail: '例：绣球 tips；暂无专用图，以文字说明为准。',
        visual: 'placeholder',
      },
      {
        id: 'pos-above-water',
        title: '切口在水面以上',
        description: '吸水端露出水面，避免切口泡烂。',
        visual: 'trim-angle',
        angle: 45,
      },
      {
        id: 'pos-remove-leaves',
        title: '去除浸水叶',
        description: '删去会没入水线的下段叶片，只留花头附近健康叶。',
        visual: 'trim-angle',
        angle: 45,
      },
      {
        id: 'pos-refresh-cut',
        title: '换水时短修',
        description: '每次换水可在茎端再修 1—2 cm，保持切口新鲜。',
        visual: 'placeholder',
      },
    ],
  },
  {
    id: 'water-depth',
    title: '加水量',
    subtitle: '对应 careVase.waterDepth；图示左侧瓶高比例、右侧浸没深度',
    items: [
      {
        id: 'water-standard',
        title: '标准水位',
        description: '约 1/3 瓶高，切口没入 2—3 cm。',
        detail: '玫瑰及多数主花默认规格。',
        visual: 'water-standard',
      },
      {
        id: 'water-shallow',
        title: '浅水位',
        description: '约 1/4 瓶高，切口没入 1—2 cm。',
        detail: '牡丹、芍药、郁金香等喜浅水品种。',
        visual: 'water-shallow',
      },
    ],
  },
  {
    id: 'vase-environment',
    title: '瓶插环境',
    subtitle: '由 careVase.environment 拆句；图标固定三类',
    items: [
      {
        id: 'env-light',
        title: '喜光 ☀️',
        description: '明亮散射光、忌暴晒等光照要求。',
        detail: '关键词：光、晒、阴、照。',
        visual: 'emoji',
        icon: '☀️',
      },
      {
        id: 'env-airflow',
        title: '通风 🌬️',
        description: '空气流通、透气，避免闷热潮湿。',
        detail: '关键词：通风、透气、空气流通。',
        visual: 'emoji',
        icon: '🌬️',
      },
      {
        id: 'env-placement',
        title: '摆放 📍',
        description: '远离空调风口、暖气、直射、挤压等位置提示。',
        detail: '关键词：风口、摆放、远离、避开、触碰、阴凉…',
        visual: 'emoji',
        icon: '📍',
      },
    ],
  },
  {
    id: 'soil-reference',
    title: '土培参考（补充块）',
    subtitle: 'careSoil / careGuide；与瓶插并列展示',
    items: [
      {
        id: 'soil-light',
        title: '喜光 ☀️',
        description: '地栽或盆栽光照需求。',
        visual: 'emoji',
        icon: '☀️',
      },
      {
        id: 'soil-water',
        title: '浇水 💧',
        description: '见干见湿、保持湿润等土培浇水原则。',
        visual: 'emoji',
        icon: '💧',
      },
      {
        id: 'soil-temp',
        title: '温度 🌡️',
        description: '适宜生长温度区间。',
        visual: 'emoji',
        icon: '🌡️',
      },
    ],
  },
  {
    id: 'other-fields',
    title: '其他养护字段',
    subtitle: '文字块，无专用小图',
    items: [
      {
        id: 'field-water-change',
        title: '换水',
        description: 'careVase.waterChange — 换水频率与清洁要求。',
        visual: 'placeholder',
      },
      {
        id: 'field-summary',
        title: '养护摘要',
        description: 'careVase.summary — 瓶插养护总述，展示在图示上方。',
        visual: 'placeholder',
      },
      {
        id: 'field-tips',
        title: '养护 tips',
        description: '条目级 tips 列表；可补充乙烯、保鲜剂、去花粉等。',
        visual: 'placeholder',
      },
    ],
  },
]
