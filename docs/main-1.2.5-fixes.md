# 1.2.5 主分支修正

## 可选模块

- `src/modules/network_route/`：直连/CDN 偏好、地址解析、Axios 拦截器、桌面与移动设置入口、文案和测试。公开的构建环境变量由模块的 `build-env.json` 声明；默认域名规则和 localStorage 键不变。
- `src/modules/partner_search/`：外部查询管理表单、API 类型和文案。站点设置页面通过通用 `adminSettings` 插槽展示独立表单，使用独立保存按钮。
- 通用设置插槽：`desktopSettings`、`mobileSettings`、`adminSettings`；通用运行时扩展：`runtime`。零模块时 API/上传地址使用原运行时 `baseURL`，媒体 URL 不改写。
- 后端查询接口地址仍为 `POST /v1/partner-search-query-entry`；管理配置改为 `GET/PUT /v1/partner-search-query-entry/settings`，必须管理员登录。前后端需配套更新。
- 目录存在即启用；删除具体模块目录后核心仍可构建。新增模块不得在核心硬编码引用。

## 移动端

- 主题与 CDN 切换放入「我」页面；底部仅保留项目、团队、我，非 Tab 页顶部不再重复放主题按钮。译图器自身的设置不变。
- 项目文件预览工具栏按实际宽度及文字长度决定是否折叠，不只依赖设备类型。折叠时按钮首次点击在下方显示功能与“再次点击执行”，再次点击同一按钮才执行。点击其它按钮/外部、滚动、Esc、调整窗口或失焦会取消上次确认。禁用按钮不执行。
- 宽屏保留文字且单击执行。按钮有可访问名称并支持键盘。
- 文件网格 `minColumns=2`，卡片和图片随列收缩；其它列表默认仍为一列。移动端键盘导致高度变化时仍更新横向列数。

## 验证

`npm run typecheck`、`npm test -- --runInBand`、`npm run build`。
浏览器回归覆盖 320/375/390/768/1300px、二次点击/取消、两列布局、移动主题/CDN 切换。
