# 沙丁鱼の小窝

一个使用液态玻璃视觉的个人主页，用来记录文章、设备、收藏和正在听的音乐。

在线地址：<https://amanyous.github.io/sardine-den/>

## 功能

- 液态玻璃背景与组件：流体背景、实时折射、深浅色切换
- 首页：欢迎入场动画与收藏推荐
- 文章：站内文章列表与详情，支持按需加载
- 关于：个人简介与站点信息
- 设备：MacBook、Windows 笔记本与手机设备卡片
- 音乐：悬浮媒体播放器，支持封面、进度条与滚动歌词

## 技术栈

- React + Vite
- Three.js：WebGL 流体背景
- GSAP：入场与页面动画
- Lucide：界面图标
- 原生 SVG Filter：液态玻璃折射效果

## 本地运行

```bash
npm install
npm run dev
```

开发服务器默认运行在 <http://127.0.0.1:5173/>。

## 构建

```bash
npm run build
```

构建产物输出到 `dist/`。

## 部署到 GitHub Pages

项目使用 hash 路由，不需要额外的服务器重写规则。仓库部署为 GitHub Pages 项目页：

```bash
npm run build:pages
npx gh-pages -d dist
```

然后在 GitHub 仓库的 `Settings -> Pages` 中选择：

- Source：`Deploy from a branch`
- Branch：`gh-pages`
- Directory：`/root`

## 目录结构

```text
src/
  App.jsx                  页面与导航
  styles.css               全局样式与液态玻璃
  components/              页面组件与玻璃组件
  components/reactbits/    WebGL 流体背景等组件
  data/articles.js         文章内容
  data/site.js             站点内容、设备与音乐数据
public/
  articles/                文章配图
  media/                   音乐、歌词与封面资源
```
