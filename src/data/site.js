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

export const stats = {
  calls: null,
  tokens: null,
  days: null,
  devices: null,
};

export const models = [];

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
