# 萌翻[MoeFlow]前端项目
[![GitHubStars](https://img.shields.io/github/stars/moeflow-com/moeflow-frontend)]()
[![GitHubForks](https://img.shields.io/github/forks/moeflow-com/moeflow-frontend)]()
[![Chinese README](https://img.shields.io/badge/README-中文-red)](README.md)
[![English README](https://img.shields.io/badge/README-English-blue)](ENG_README.md)

**由于部分API代码调整，请更新萌翻后端到对应 Version.1.0.1 后继续使用。**

## 部署方法

非开发者建议参考 [moeflow-deploy](https://github.com/moeflow-com/moeflow-deploy) ，用docker和docker-compose部署。

## 技术栈

- Core
  - react
  - react-router // 路由
  - emotion // CSS in JS
  - react-intl // i18n
  - redux
    - react-redux
    - redux-saga // 副作用处理
  - immer.js // 不可变对象处理
- UI
  - antd
  - antd-mobile
  - classnames
  - fontawesome
- Other
  - pepjs // Pointer 事件垫片
  - bowser // 浏览器识别
  - why-did-you-render // 性能优化
  - lodash // 工具库
  - uuid
  - fontmin // 字体剪切

## 本地开发

1. 安装 Node.js 近期LTS版本，如v18 v20
2. `npm install` 安装依赖项
3. `npm start` 启动vite 开发服务器
    - 开发服务器自带API反向代理。默认将 `localhost:5173/api/*` 的请求转发到 `localhost:5000/*` (本地moeflow-backend开发版地址)
    - 上述配置可在 `vite.config.ts` 修改。比如不用本地的moeflow-backend，改用公网的服务器。
4. `npm build` 发布前端代码，**请注意** 此时使用的后端地址配置为 `.env` 中的配置。
    - 如果没有创建 `.env` 则为默认值 `/api`。

如果您要部署到 `Vercel` 之类的网站托管程序上，您可以直接将 `REACT_APP_BASE_URL` 相对应的后端接口地址配置到托管程序的环境变量中。

## 修改项目配置

如果您的译制组不是从 日语(ja) 翻译为 繁体中文(zh-TW) 您可以修改 `src/configs.tsx` 文件中的对应位置的配置（文件中有注释）。
以下是常见的几个语言代码：

- `ja` 日语
- `en` 英语
- `ko` 朝鲜语（韩语）
- `zh-CN` 简体中文
- `zh-TW` 繁体中文

## 版本更新内容

### Version 1.0.0

萌翻前后端开源的首个版本

### Version 1.0.1

1. 处理一些数据处理和界面上的BUG
2. 调整需要初始化的默认配置内容，减少后只需要修改环境变量 `REACT_APP_BASE_URL` 指向您部署的后端地址。
3. 调整静态文件生成的目录结构，方便前后端联合部署。
4. 调整“创建团队”、“创建项目”页面中部分项目提交的内容。**（请配合最新版本的后端，避免出现数据格式问题！）**
5. 可配置网站标题等位置的内容，请从 `src/locales` 中查找对应词汇进行修改。

### Version 1.0.3

(旧构架的最后稳定版本。如果新版本中遇到问题，建议回退至此版本尝试。)

1. 支持设置和显示首页 HTML/CSS
2. 同时构建linux-amd64和linux-aarch64镜像。此版本起可以部署到ARM机器。

### Version 1.1.0

1. 抛弃create-react-app和webpack，改用vite构建。

### Version 1.1.1

- i18n: english locale
- EXPERIMENTAL manga-image-translator based assisted translation
- upgrade deps
- minor fixes

### Version 1.2.0 (Shoreline 欶澜定制版)

#### 核心与前后端协同功能
- **单独压缩预览图片**：支持缩略图与重采样图片分离生成，大图预览与列表加载流畅度大幅提升。
- **项目卡片快捷登记人员**：在项目列表卡片即可直接快捷登记与编辑工作人员分工，无需频繁进入详情页。
- **用户别名**：支持用户自定义个性化站点别名，并支持团队创建者覆盖与显示名称首选切换，全站保持一致展示。
- **轮询更新项目列表编辑状态和最新数据**：引入 Presence 心跳感知能力，实时浮动高亮正在编辑成员，并自动轮询检测列表数据更新提醒同步。
- **按成员/跨项目集搜索项目**：新增按工作人员及限定身份角色跨项目集全局高级筛选，方便多项目分工检索。
- **邮件寄送校对稿**：翻译器内支持一键/快捷键触发校对反馈邮件，自动生成带图文 Diff 变更对照与抄送支持的专业邮件模板。
- **从 TG Bot 导入漫画**：配合后端归档导入任务，支持通过 Telegram Bot 等外部机器人自动推送压缩包并一键建坑导入。

#### 前端独占特性与体验提升
- **特殊符号编辑器**：翻译器内置自定义快速输入符号组面板，支持快捷键触发录入及画布底图样式的按键速查指南。
- **全局深度暗黑模式**：全站样式与色彩深度适配 Dark Mode（含图片选择面板、分页导航、浮动卡片等），并提供防白闪和暗黑下图片亮度微调。
- **移动端长按删除标签**：移动设备针对小屏交互优化，长按即可快速唤起删除/编辑标签等快捷操作。
- **键盘流操作优化**：支持校对稿发送快捷键、输入法聚焦安全保护与模式快捷键平滑切换。

### Version 1.2.1

- **项目成员快捷编辑器移动端适配**：
  - 修复窄屏下弹窗坐标计算为负导致严重偏左溢出屏幕的问题，移动端（<= 640px）自动切换为居中遮罩模态框。
  - 完整模式下职位列表在移动端由固定双栏重构为顶部横向滚动 Tab 栏，给成员操作面板提供完整屏幕宽度。
  - 简略模式在移动端（<= 480px）自动转为单列流式布局，优化触控热区与防止长文本溢出。

### Version NEXT

- [diff](https://github.com/moeflow-com/moeflow-frontend/compare/v1.1.1...main)
