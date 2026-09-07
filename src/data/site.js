const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, '');
const asset = (path) => `${baseUrl}${path}`;

export const site = {
  name: '沙丁鱼の小窝',
  latinName: 'SARDINE DEN',
  headline: '欢迎来到沙丁鱼の小窝',
  headlineLead: '欢迎来到',
  headlineBrand: '沙丁鱼の小窝',
  intro: '一个用来收集模型、设备与日常碎片的小地方。',
  email: 'airtonlauber766@gmail.com',
  github: 'https://github.com/Amanyous',
  avatar: asset('/avatar.jpg'),
};

export const themePalettes = {
  light: ['#ffd6e8', '#ff9ac8', '#ff6f9f'],
  dark: ['#5227FF', '#FF9FFC', '#B497CF'],
};

export const favorites = [
  {
    name: 'Apple Liquid Glass',
    description: '新系统那套液态玻璃，做这页时反复翻的规范。',
    href: 'https://developer.apple.com/design/human-interface-guidelines/liquid-glass/',
  },
  {
    name: 'Aceternity UI',
    description: '经常从这里找组件起点，再改成自己的样子。',
    href: 'https://ui.aceternity.com/',
  },
  {
    name: 'Godly',
    description: '搜集完成度高的网页，用来拆布局和交互。',
    href: 'https://godly.website/',
  },
  {
    name: '硅基流动',
    description: '模型 API 的备用入口，跑不同模型时用它。',
    href: 'https://siliconflow.cn/',
  },
];

export const articles = [
  {
    id: 'image-studio',
    tag: '工具',
    date: '2026-09-07',
    title: 'Image Studio 上手：一个开源图像生成客户端',
    summary:
      '面向 OpenAI 兼容图像上游的桌面客户端，专门对付长推理的 524/504 断连。花几分钟配好上游，跑通第一张图。',
    body: [
      {
        type: 'p',
        text: 'Image Studio 是一个面向 OpenAI 兼容图像上游的开源桌面客户端，用 Wails（Go + React/TS）构建，另带一个 Android WebView 壳层。它的重点不是再包一层 UI，而是想办法扛住长时间的图像推理，尤其是上游挂在 Cloudflare / Nginx 后面时常见的 524 / 504 断连。项目不内置任何上游，第一次启动后需要你自己填 BASE_URL、API Key、文本模型和图像模型。',
      },
      {
        type: 'h2',
        text: '它解决什么问题',
      },
      {
        type: 'p',
        text: '图像生成一旦推理超过 100 秒，一次性的 HTTP 请求很容易被网关判定为空闲而掐断。Image Studio 在 Responses API 模式下用 SSE（或 WebSocket mode）持续推送事件，让连接一直保持活跃，本地还有 3 次自动重试和 15 秒退避；如果最后一张大图没拿到，但已经收到了 partial_image_b64，它会尽量帮你存下部分结果。如果你用的是只提供标准图像接口的兼容上游，也可以切到 Images API，走 /v1/images/generations 和 /v1/images/edits。',
      },
      {
        type: 'h2',
        text: '界面一览',
      },
      {
        type: 'img',
        src: asset('/articles/image-studio-workspace.png'),
        alt: 'Image Studio 工作台界面',
        caption: '工作台：左侧写提示词和参数，中间是画布，右侧是当前上游与生成历史。',
      },
      {
        type: 'p',
        text: '打开之后是一个三栏工作台：左侧负责预设、提示词和参数，中间是画布，右侧展示当前上游和生成历史。中间空着的时候会提示“还没有图片”，先在左侧写好提示词，再点生成，第一张图就会出现在这里。',
      },
      {
        type: 'h2',
        text: '第一次启动：配置上游',
      },
      {
        type: 'img',
        src: asset('/articles/image-studio-config.png'),
        alt: 'Image Studio 上游配置面板',
        caption: '上游配置：选好 API 形态，填 BASE_URL、API Key 与模型 ID，保存前先测一次连接。',
      },
      {
        type: 'p',
        text: '首次启动会自动打开「上游配置」。需要填几样东西：API 形态（Responses API 或 Images API）、你自己的 OpenAI 兼容中转站地址 BASE_URL、API Key、文本模型 ID 和图像模型 ID。保存前建议先点一次「测试连接」，确认当前这套配置真的能走通。API Key 会交给浏览器 Keychain / Chrome 口令 / Secret Service 这类系统安全位保存，不会明文写进本地存储。',
      },
      {
        type: 'h2',
        text: '怎么选 API 形态',
      },
      {
        type: 'p',
        text: '两种形态对应不同的上游能力，选哪个取决于你的 Key 和上游实现。',
      },
      {
        type: 'list',
        items: [
          'Responses API：调用 /v1/responses，用模型内置的 image_generation 工具出图，SSE 流式接收。适合图像推理容易超过 100 秒、上游躲在 Cloudflare / Nginx 后面，或者你的 Key 有文本模型权限的场景。',
          'Images API：调用标准图像接口，文生图走 /v1/images/generations，图生图走 /v1/images/edits。适合上游不支持 Responses API、Key 只绑了 image 分组，或者你只想要最大兼容性的场景。',
        ],
      },
      {
        type: 'p',
        text: '另外在参数预言里可以选择请求策略：OpenAI 标准只发官方公开字段，兼容中转扩展会额外带上 seed、negative_prompt 这类 relay 常见字段。如果你明确知道上游支持，再选兼容中转扩展。',
      },
      {
        type: 'h2',
        text: '先生成第一张图',
      },
      {
        type: 'p',
        text: '文生图的流程很直接：选「文生图」，输入 prompt，再挑比例、质量、输出格式和风格。内置比例不够用时，可以打开「自定义比例」弹窗新增并保存常用宽高比。需要的话再设置 seed 或 negative prompt，然后点「生成」，或者直接用 Cmd / Ctrl + Enter。生成成功后，toast 会提供查看详情的入口，详情抽屉里能看到图片预览、全部参数、原始 prompt、优化后 prompt、保存路径和 raw 响应路径。',
      },
      {
        type: 'h2',
        text: '图生图与批处理',
      },
      {
        type: 'p',
        text: '图生图可以拖入本地图片、粘贴剪贴板图片或点添加图片，切到「图生图」后输入修改要求；需要精准控制就切到画板里的蒙版工具画一下。桌面端的图生图还支持批处理：在源图片 / 参考图区域顶部切到「批处理」，选输入目录，确认扫描到的图片数量，选择保存回原目录或指定输出目录，设置并发数，点「编辑」开始。结果默认命名成 processed-原文件名，同目录有同名会自动避重。批处理只处理当前这层目录，不递归子目录。',
      },
      {
        type: 'h2',
        text: '输出与历史',
      },
      {
        type: 'p',
        text: '生成的图片默认落在输出目录的 images/ 子目录，原始响应和排错日志落在 log/ 子目录。历史元数据存在 IndexedDB 里，自定义比例也会保存在本地，下次启动还在。历史可以导出成 JSON，也能重新导入。',
      },
      {
        type: 'note',
        text: '遇到「生成失败 / 保存失败 / 模型不可用」这种提示，先别急着怪软件。在当前 profile 里点一次「测试连接」，对照官方的 troubleshooting 查一下 524/504、401/403、model not found、多参考图或蒙版不生效这些常见问题，再看历史详情里的真实 HTTP 状态码和上游报错。同一个 BASE_URL + Key + 模型 ID 在 curl 或 Postman 里也失败的话，多半要先找你的上游服务商。',
      },
    ],
  },
];

export const devices = [
  {
    id: 'macbook-pro-2019',
    category: '笔记本',
    name: 'MacBook Pro 13"',
    model: '2019 · Intel i5',
    role: '轻巧顺手的工作本',
    specs: 'Retina 屏 · Touch Bar · Touch ID',
    image: asset('/devices/macbook-pro-2019.jpg'),
    source: 'https://support.apple.com/zh-cn/111945',
  },
  {
    id: 'msi-crosshair-16-2024',
    category: '笔记本',
    name: '神影 16 2024',
    model: '2024 · Intel HX',
    role: 'Windows 高性能本',
    specs: '16" 2.5K · 240Hz · 100% DCI-P3',
    image: asset('/devices/msi-shenying16.png'),
    source: 'https://www.msi.cn/Laptop/Crosshair-16-HX-D14VX/Gallery',
  },
  {
    id: 'xiaomi-12s',
    category: '手机',
    name: 'Xiaomi 12S',
    model: '2022 · Snapdragon 8+ Gen 1',
    role: '小屏手感旗舰',
    specs: '6.28" 120Hz · 徕卡影像 · 67W',
    image: asset('/devices/xiaomi-12s.jpg'),
    source: 'https://www.mi.com/mi12s',
  },
  {
    id: 'galaxy-z-flip5',
    category: '手机',
    name: 'Galaxy Z Flip5',
    model: '2023 · Snapdragon 8 Gen 2',
    role: '折叠随身小屏',
    specs: '6.7" 柔性屏 · 3.4" 外屏',
    image: asset('/devices/samsung-z-flip5.jpg'),
    source: 'https://www.samsung.com/us/smartphones/galaxy-z-flip5/',
  },
];

export const playerTrack = {
  title: 'Love Me Harder x We Don\'t Talk Anymore',
  artist: 'Mashup Edit',
  src: asset('/media/love-me-harder-x-wdta.mp3'),
  cover: asset('/media/cover.svg'),
  lrc: asset('/media/love-me-harder-x-wdta.lrc'),
  lyrics: [
    'tell me something i need to know',
    'then take my breath and never let it go',
    'if you just let me ignite your space',
    "i'll take the pleasure, take it with the pain",
    "and if in the moment i bite my lip",
    "baby in that moment you'll know",
    'this is something bigger than us and beyond bliss',
    'give me a reason to believe it',
    "cause if you want to keep me",
    'you gotta gotta gotta gotta got to love me harder',
    "and if you really need me",
    'you gotta gotta gotta gotta you got to love me harder',
    'love me harder',
    'i know your motives and you know mine',
    'the ones that love me i tend to leave behind me',
    'and you will stay',
    'then take this pleasure and take away the pain',
    "and in the moment you bite your lip",
    "when i gotta get you going you know it's real",
    'gotta feel the pressure between your hips',
    "i'll make it feel like the first time",
    "cause if you want to keep me",
    'you gotta gotta gotta gotta love me harder',
    "the way i do before we don't talk anymore",
    "i can't get you out of my brain",
    "oh it's such a shame",
  ],
};

export const changelog = [
  {
    date: '2026-09-08',
    version: '0.7.0',
    title: '统计改为文章',
    items: [
      '把“统计”改为“文章”',
    ],
  },
  {
    date: '2026-09-07',
    version: '0.6.0',
    title: '更新日志翻页书',
    items: [
      'About 页面布局优化，加入完整建站更新记录',
      '更新日志改为可翻页的小册子，支持连续翻页与键盘操作',
      '移动端更新日志支持左右滑动翻页',
      '窄屏下日志页可滚动浏览，不显示滚动条',
      '修复书页背景灰边与棱角，浅色书页使用粉紫玻璃渐变',
    ],
  },
  {
    date: '2026-09-07',
    version: '0.5.0',
    title: '建站以来更新日志',
    items: [
      '关于页加入完整更新历史',
      '支持 GitHub Pages 线上部署',
    ],
  },
  {
    date: '2026-09-07',
    version: '0.4.0',
    title: '音乐播放器与移动端',
    items: [
      '接入音乐播放器：封面、播放进度、滚动歌词',
      '长歌名自动跑马灯，播放按钮独立显示',
      '移动端支持左右滑动切换页面',
      '移动端性能优化：流体降帧、离屏玻璃卡片跳过绘制',
      '修复：歌词不滚动与定位偏移',
      '修复：长歌名显示不全',
      '修复：播放按钮遮挡封面',
      '修复：移动端左右滑动无法切页',
    ],
  },
  {
    date: '2026-09-06',
    version: '0.3.0',
    title: '内容与折射重构',
    items: [
      '设备页加入真实机型图与官网入口',
      '实时折射重构并清理旧版液体玻璃代码',
      '全站玻璃效果与控件样式统一',
      '导航胶囊过渡与拖动交互',
      '修复：玻璃发灰发闷、内部色差',
      '修复：玻璃边缘棱角与底部横线',
      '修复：设备页滚动与悬停卡顿',
    ],
  },
  {
    date: '2026-09-05',
    version: '0.2.0',
    title: '液态玻璃视觉',
    items: [
      '动态流体背景',
      '液态玻璃导航胶囊与卡片',
      '移动端悬浮底部导航',
      '收藏与推荐内容',
      '修复：导航激活胶囊样式与重复圆点',
      '修复：深浅色切换的大白圈与过快动画',
      '修复：入场文字动画的小圆点与收笔',
    ],
  },
  {
    date: '2026-09-05',
    version: '0.1.0',
    title: '小窝建立',
    items: [
      '基于 React + Vite 搭建个人主页',
      '手写 Hello 入场动画与欢迎文案',
      '首页、关于、统计、设备页面骨架',
      '深浅色主题',
    ],
  },
];
