const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, '');
const asset = (path) => `${baseUrl}${path}`;

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
