# 项目身份标签改造：前端迁移参考

> **状态说明（2026-08-18）**：本文档是身份标签迁移**进行期**的前端改造参考，
> 引用的后端文档（project-identity-tags*.md）已随迁移完成归档，正文部分仅作
> 历史背景保留，不再逐条承诺当前运行时行为。
> 当前权威说明见：
> - `moeflow-backend/docs/project-identity-tags-change-summary.md`（规格与数据模型）
> - `moeflow-backend/docs/identity-refactor-review-and-fixes.md`（审查、修复与各轮验证）
> - 前端键名映射约定：`stringToLowerCamelCase` 产出 `*Ids*`（小写 d）拼写，
>   消费方一律不得使用 `*IDs*`（见 review 文档 §12/§14③）。

> 适用时机：后端完成项目成员、团队成员、权限和项目状态重构后。
>
> 后端依据：
> - `../..\moeflow-backend\docs\project-identity-tags.md`
> - `../..\moeflow-backend\docs\project-identity-tags-implementation.md`
> - `../..\moeflow-backend\docs\project-identity-tags-api.md`

## 总原则

这次不是把 `role` 改名为 `tags`。前端需要同时切换以下运行时数据源：

- 项目成员使用 `ProjectMember`，可以是注册用户或外部署名；
- 团队成员使用 `TeamMember`，区分 `base_tag`、团队标签和工作人员资格；
- 权限使用服务端计算的命名空间字符串，如 `project:ACCESS`；
- 项目状态使用 `NORMAL`、`COMPLETED`、`CLEARED`；
- `Project.workers`、旧单一 `role`、旧项目成员写接口不再作为运行时数据源；
- 认证仍使用现有 `Authorization: Bearer <token>`。

### 当前过渡边界

本稿描述的是前端迁移目标，不表示所有后端响应已经完成字段清理。当前后端仍可能在旧项目/团队响应中返回 `role`、`default_role` 等兼容字段；这些字段不能被新页面用于身份展示、权限判断或写回。前端完成迁移后，再由后端删除兼容响应字段。

新身份 API 使用字符串项目状态；部分旧项目接口在过渡期仍可能返回数字 `status`，并同时提供 `identity_status`/`status_name`。调用方必须按具体 API 的响应契约归一化，不能全局假定所有 `APIProject.status` 已经是字符串。

`workers` 只允许由后端离线迁移/审计工具读取。前端运行时既不能读取，也不能把旧字段重新放回项目对象；后端迁移脚本读取旧 `w` 字段不构成前端兼容要求。

## 1. API 和数据类型

重点文件：[project.ts](../src/apis/project.ts)、[member.ts](../src/apis/member.ts)、[team.ts](../src/apis/team.ts)、[user.ts](../src/apis/user.ts)、[insight.ts](../src/apis/insight.ts)。

- 新身份项目接口的状态使用 `NORMAL | COMPLETED | CLEARED`；旧项目接口过渡期可能仍返回数字 `status`，类型层应按接口拆分或在 API 边界归一化，而不是修改一个全局类型后掩盖差异。增加 `ownerUserId`、`statusVersion`，按后端实际响应补充当前用户权限摘要和成员摘要。
- 删除运行时对 `APIProject.role`、`APIProject.workers`、`autoBecomeProjectAdmin` 的依赖。后端暂时保留的 `role`/`default_role` 兼容响应只能被旧页面消费，不能进入新身份状态或作为权限来源；`workers` 只属于后端离线迁移，不应进入前端类型或状态。
- 团队项目搜索参数把旧 `role` 改为 `tag`；工作人员标签使用新代码：`raw_provider`、`scanner`、`cropper`、`cleaner`、`translator`、`proofreader`、`typesetter`，并支持团队自定义项目标签。
- 删除旧 `DELETE /v1/projects/{id}` 完结、旧 `/workers` 解析/更新和旧 `/users/{user_id}` 成员写接口的调用。
- 新增项目成员 API：
  - `GET /v1/projects/{project_id}/members`；
  - `POST /v1/projects/{project_id}/members/changes`；
  - `POST /v1/projects/{project_id}/members/{member_id}/bind`；
  - `POST /v1/projects/{project_id}/owner/transfer`。
- 新增团队成员 API：`GET/POST/PATCH/DELETE /v1/teams/{team_id}/members...`，修改时携带 `expected_version`。
- 成员批量操作需要客户端生成唯一 `operation_id`，写请求应支持 `Idempotency-Key`；批次可能部分成功，不能假设整批事务回滚。
- 用户 API 增加 `aliases` 及以下接口：`PATCH /v1/me/aliases`、管理员的 `PATCH /v1/users/{user_id}/aliases`。团队 alias 使用独立的团队成员 alias 接口。
- `APIUser`、团队成员、项目成员和洞察接口类型都要去除对旧 `Role` 的强依赖。成员展示至少支持 `memberId`、`userId`、`externalId`、`displayName`、`tags`、`status`、`version`、`isOwner`。
- 现有 `toLowerCamelCase` 可以继续用于新响应，但不再保留 `workers` 的特殊转换逻辑。

## 2. 权限判断

重点文件：[user.ts](../src/utils/user.ts)、[project.ts](../src/constants/project.ts)、[team.ts](../src/constants/team.ts)、[team.ts](../src/interfaces/team.ts)，以及所有调用 `can()` 的页面和组件。

- 重写 `can()`：从 `group.role.permissions` 和数字权限改为服务端返回的 `effectivePermissions`/权限快照，匹配 `project:*`、`team:*` 字符串。
- 项目权限至少覆盖 `project:ACCESS`、`project:CHANGE`、文件/翻译/校对权限和项目完成/恢复所需权限。项目清空不是普通项目权限字符串：`clear` 由所属团队 creator 的特殊身份单独授权，前端不能检查或提交 `project:CLEAR_PROJECT`。
- 团队 creator/admin 的项目权限是运行时继承结果，不能通过给项目成员添加标签来模拟；普通团队成员也可能没有 `ProjectMember` 但拥有项目 `ACCESS`。
- 不再使用 `role.level`、`role.systemCode`、`role.permissions` 判断成员能否编辑、删除或分配角色。标签可分配范围由后端策略和返回结果决定。
- 权限变更、标签变更、团队身份变更和项目状态变更后，应刷新项目/团队权限快照；不能长期复用 Redux 中的旧 `role`。

需要统一检查的权限消费者包括：

- 项目文件和翻译操作：[FileList.tsx](../src/components/project/FileList.tsx)、`src/components/project-file/` 下的标记、翻译、校对组件；
- 项目设置：[ProjectSetting.tsx](../src/pages/ProjectSetting.tsx)、[ProjectSettingBase.tsx](../src/components/project/ProjectSettingBase.tsx)、[ProjectEditForm.tsx](../src/components/project/ProjectEditForm.tsx)；
- 团队设置和项目集：[TeamSetting.tsx](../src/pages/TeamSetting.tsx)、[TeamSettingBase.tsx](../src/components/team/TeamSettingBase.tsx)、`src/components/project-set/`；
- 项目列表：[ProjectItem.tsx](../src/components/project-list/ProjectItem.tsx)。

## 3. 项目列表和工作人员展示

重点文件：[ProjectList.tsx](../src/components/project-list/ProjectList.tsx)、[ProjectItem.tsx](../src/components/project-list/ProjectItem.tsx)、[MemberStats.tsx](../src/components/shared/MemberStats.tsx)、[EditWorkers.tsx](../src/components/shared/EditWorkers.tsx)。

- 项目列表不再从 `project.workers` 生成工作人员信息，也不再在请求后手动把旧 `workers` 放回对象。
- `search-worker` 必须提交 `worker_name`、可选 `tag`、状态和项目集条件；标签参数是 `tag`，不是旧的 `role`。
- 工作人员名称搜索由后端完成四来源并集：`User.name`、`User.aliases`、当前团队 `TeamMember.aliases`、当前项目 `ProjectMember.display_name`。前端不要再本地过滤或根据昵称推断身份。
- `ProjectItem` 和 `MemberStats` 改为消费项目成员摘要或成员统计。外部署名只显示 `displayName` 和标签，不能显示为已绑定用户，也不能据此判断权限。
- `EditWorkers` 的逗号分隔整表保存方式必须移除或改成成员差别操作。更新成员必须提交 `memberId + expectedMemberVersion`，新增/移除必须提交独立 operation，不能用“省略某人”表示删除。
- 项目卡片上的编辑入口需要考虑项目状态和成员管理权限；普通用户只能修改自己的标签，不能直接编辑其他人的工作人员名称。
- 列表状态数据支持三种状态，但 `ProjectList__Statuses` 仍使用两组筛选：进行中包含 `NORMAL`，已完结包含 `COMPLETED` 和 `CLEARED`，并确保筛选在分页前由后端完成。个人项目列表只展示当前用户 `ProjectMember.status=active` 的项目；团队成员可以查看团队项目，即使没有项目成员记录。

现有的 [projectWorkers.ts](../src/components/shared/projectWorkers.ts) 及其测试需要删除或改为新标签/成员摘要的纯展示测试；不能继续覆盖旧 `workers` JSON 结构。

## 4. 成员、邀请和申请

重点文件：[MemberList.tsx](../src/components/shared-form/MemberList.tsx)、[RoleSelect.tsx](../src/components/shared-form/RoleSelect.tsx)、[InviteUser.tsx](../src/components/shared-member/InviteUser.tsx)、[InvitationList.tsx](../src/components/shared-member/InvitationList.tsx)、[ApplicationList.tsx](../src/components/shared-member/ApplicationList.tsx)。

- `MemberList` 需要按 `project`/`team` 拆分处理：项目使用项目成员 API，团队使用团队成员 API，不能继续调用通用的 `/users` 成员路径。
- 项目成员编辑改为 `tags`、`displayName`、`status=removed`；团队成员编辑改为 `baseTag`、团队 `tags`、`workerQualifications`。所有更新都带版本号。
- 用新的标签选择器/成员编辑器替代 `RoleSelect`。项目 creator/admin、团队 creator/admin 和普通成员的可编辑边界由后端强制执行，前端只做按钮显示优化。
- 项目新增注册用户时，除团队 creator 直接新增 active 成员外，其他情况必须经过现有邀请流程适配器；不能在前端伪造接受邀请或直接把成员标为 active。
- 项目邀请界面不再让客户端用旧 `roleID` 决定新权限。当前后端仍通过 `ProjectInvitationAdapter` 调用旧 Invitation 流程，因此底层请求可能仍要求兼容的 `role_id`/旧 `role`；该值由适配层或现有邀请流程生成/传递，前端不应让用户用它配置新身份，也不能把它作为权限来源。接受、拒绝、取消和通知生命周期保持不变，待后端邀请接口完成改造后再移除兼容传参。
- 申请处理后的角色下拉和 `api.member.editMember()` 调用需要改为成员标签/团队基础身份更新；不能再使用 `groupRoles`、`userRole` 和角色等级比较。
- 外部署名新增、绑定注册用户和合并是不同操作。搜索结果只能供人工选择，不能自动绑定第一条用户；绑定使用 `memberId + expectedVersion` 调用独立 bind API，遇到 `MEMBER_MERGE_REQUIRED` 时进入明确的合并流程。
- 移除成员是软删除。项目退出提交 `status=removed`，团队退出调用团队成员删除接口；不要再按用户 ID 物理删除项目成员关系。

## 5. 项目生命周期

重点文件：[project.ts](../src/apis/project.ts)、[ProjectSettingBase.tsx](../src/components/project/ProjectSettingBase.tsx)、[ProjectSetting.tsx](../src/pages/ProjectSetting.tsx)、[ProjectFiles.tsx](../src/pages/ProjectFiles.tsx)、[ProjectFinishedTip.tsx](../src/components/project/ProjectFinishedTip.tsx)、[slice.ts](../src/store/project/slice.ts)。

- 增加三个动作 API：
  - `POST /v1/projects/{id}/complete`：`NORMAL -> COMPLETED`，保留内容；
  - `POST /v1/projects/{id}/reopen`：`COMPLETED -> NORMAL`；
  - `POST /v1/projects/{id}/clear`：清理内容后进入 `CLEARED`，只允许所属团队 creator。
- 高风险操作携带 `expected_status`、`expected_version` 或等价的 `If-Match`，处理状态冲突和可重试的 `CLEAR_OPERATION_RETRYABLE`。
- `COMPLETED` 不是旧的“已清空”：项目内容仍可查看但应进入只读状态，并提供 reopen；`CLEARED` 内容不可恢复，不能显示 reopen。
- 设置页不能再因为一个 `FINISHED` 数字状态统一跳到“完结提示”。应分别处理 `COMPLETED` 和 `CLEARED`。
- 删除旧 `finishProject()`/`DELETE` 调用和 `PROJECT_PERMISSION.FINISH`。完结/恢复按钮位于普通操作区；清空作为单独的高风险操作，只允许后端授权的团队 creator，不能把项目 creator/admin 的完结权限扩大为清空权限。
- 文件上传、移动、改名、删除、翻译和标记操作除检查权限外，还必须在 `NORMAL` 状态下显示/启用；后端仍是最终拒绝方。

## 6. 团队标签策略、默认角色和 alias

- 团队设置中增加标签策略入口，目标调用：
  - `GET /v1/teams/{team_id}/identity-tag-policy`；
  - `PATCH /v1/teams/{team_id}/identity-tag-policy`，携带 `expected_version`、`upserts`、`removes`。
- 策略页维护团队标签和项目标签；项目标签不是在项目设置页单独定义。显示 `permissions`、`assignable`、`source` 和策略版本。
- [RoleRadioGroup.tsx](../src/components/shared-form/RoleRadioGroup.tsx)、[TypeRadioGroup.tsx](../src/components/shared-form/TypeRadioGroup.tsx) 以及团队/项目创建编辑表单中的 `defaultRole`/`systemRole` 需要移除或按后端新创建契约重做。
- 项目默认角色不能继续隐式授予新项目成员项目权限；团队新成员默认是 `base_tag=member`，工作人员资格需要明确配置。
- `autoBecomeProjectAdmin` 和 `AUTO_BECOME_PROJECT_ADMIN` 是旧继承开关，不能继续作为新权限来源。
- 用户设置增加站点 alias 的整体替换；团队成员页增加团队 alias 的整体替换。两者互不同步，项目 `displayName` 也不是 alias。

## 7. 洞察和列表型接口

重点文件：[insight.ts](../src/apis/insight.ts)、[TeamInsightUserList.tsx](../src/components/team/TeamInsightUserList.tsx)、[TeamInsightProjectList.tsx](../src/components/team/TeamInsightProjectList.tsx)。

- `APIInsightUserProject` 不应继续继承带 `role`/`workers` 的旧 `APIProject`。
- `APIInsightProjectUser` 和洞察页面展示改为成员摘要、`displayName`、`tags`、`status`；外部署名可能没有 `userId`，不能假设所有成员都有 `APIUser`。
- 洞察、项目集和成员搜索均不能回退读取 `Project.workers`，也不能把 `role.name` 作为人员身份展示。
- 后端需和前端确认洞察接口的新响应字段后再切换类型，避免 API 已切换但洞察页仍因 `project.role`/`user.role` 崩溃。

## 8. 请求错误和测试

- 新错误码是字符串，例如 `PROJECT_MEMBER_VERSION_CONFLICT`、`PROJECT_STATE_CONFLICT`、`NO_PERMISSION`；需要检查 [apis/index.ts](../src/apis/index.ts) 当前只按数字 `code` 和旧错误体解析的逻辑。
- 兼容后端错误响应中的嵌套 `error.code`、`request_id`，并为版本冲突、重复成员、需要合并和清空可重试错误提供明确提示及刷新逻辑。
- 成功写入后不要只修改本地一条旧 role 对象；根据批次结果刷新成员、项目权限和计数。部分成功批次必须保留已完成操作的结果。
- 补充 API mock/集成测试：三种项目状态、权限字符串和团队继承、`active/invited/removed`、外部署名无权限、标签并集、版本冲突、幂等重试、成员绑定/合并、alias 作用域和项目搜索四来源并集。
- 补充页面测试：项目列表 `tag` 搜索、项目卡片成员展示、成员标签编辑、邀请接受后状态刷新、`COMPLETED` 只读与 reopen、`CLEARED` 不可恢复，以及团队 creator 才能 clear。

## 建议修改顺序

1. 先更新 API 类型、项目状态常量、权限快照和请求错误解析。
2. 再切换项目列表/成员 API，删除 `workers` 和旧 `role` 的运行时读取。
3. 接着改项目生命周期、文件操作门控和团队标签策略页。
4. 最后改邀请/申请、alias、绑定合并、洞察和完整测试。

## 9. 待确认的 UI 改动

以下是前端实现前需要确定的界面和交互，不限定具体视觉方案。确认后再据此拆分组件、API 状态和页面测试。

### 项目列表和项目卡片

- `ProjectItem` 保留现有人员展示，只展示翻译、校对和嵌字状态，不增加其他职位或成员数量。
- 项目卡片继续使用现有布局，通过状态视觉效果区分三种状态：`NORMAL` 保持原样，`COMPLETED` 使用灰色覆盖层，`CLEARED` 使用带红色删除线的效果；状态视觉不改变卡片结构。最终覆盖层和删除线的颜色、透明度及文字可读性待完成品实测后再决定。
- `ProjectList__Statuses` 仍只保留现有“进行中/已完结”分组，`COMPLETED` 和 `CLEARED` 都归入“已完结”，不新增第三个筛选分组。
- 快捷窗口中的翻译、校对、嵌字编辑入口保留，但成员和标签的完整配置跳转到项目 `/setting/member` 页面。

### 项目内容和生命周期

- 原有完结按钮移出危险区域并删除危险区域。`NORMAL` 项目显示完结按钮，`COMPLETED` 项目显示恢复按钮；清空按钮只对后端确认有清空权限的用户显示，当前规则为所属团队 creator。
- `CLEARED` 项目和现有已完结项目一样不能进入可用设置；`COMPLETED` 项目可以进入专用只读页面，并保留恢复入口。
- `COMPLETED` 页面中的 `ImageSourceViewer__List` 必须改为只读，或创建等价的只读 viewer；文件上传、移动、重命名、删除、翻译和标记操作均不可用。`CLEARED` 使用不可恢复的清空状态展示，不提供恢复按钮。
- 清空操作仍需在执行前确认不可恢复风险，并展示进行中、可重试失败和最终状态；按钮显隐不能替代后端权限校验。

### 项目成员管理

- `MemberStats__Button` 打开的快捷窗口保留。窗口增加团队成员搜索：输入关键词后 debounce 请求，展示可选注册用户；点击职位且未输入关键词时，搜索区域展示当前项目成员，便于为已有成员追加多个标签。
- 快捷窗口继续按职位分配成员，不改变用户的主要操作习惯。同一成员被分配到多个职位时，视为同一个成员拥有多个项目标签；界面可以在不同职位区域重复显示该成员，但提交模型中只能保留一条成员记录。
- 前端打开窗口时保存成员和标签的原始快照，编辑期间维护以稳定身份为键的草稿集合：注册用户使用 `memberId`/`userId`，外部署名使用 `memberId`/`externalId`，不能用展示名合并成员。同一成员在多个职位区域的选择结果合并为一个 `tags` 集合。
- 点击搜索结果的职位或手动回车只修改内存中的草稿，不立即写服务器。确认时对原始快照和草稿做差分：新增成员生成 `add` 操作，职位变化生成带 `expectedMemberVersion` 的 `update(tags)` 操作，明确取消成员生成 `update(status=removed)`；同一成员的多个职位变化合并为一次标签更新。
- 搜索结果需要区分“注册用户”和“当前项目已有成员”。未输入关键词时按职位展示项目成员，输入关键词时搜索团队注册用户；选中已有成员是追加/移除标签，选中新用户是创建成员草稿。需要保留取消、重复选择和清空某一职位时的明确语义，不能用省略成员隐式删除。
- 快捷窗口不编辑项目 `displayName`，增加跳转到 `/setting/member` 的入口。
- `/setting/member` 改为左右分栏：左侧列出该项目全部成员卡片，包括 `removed` 成员，并显示名称/展示名、注册用户或外部署名、状态、owner 等基础信息；右侧显示当前选中成员的标签、状态、展示名、绑定/合并和权限摘要配置。
- 项目标签选择器按系统标签和团队自定义项目标签分组；不可分配标签显示原因或只读状态。普通成员只能修改自己的标签，具体权限以服务端返回为准。
- `invited` 按当前邀请行为视为瞬时后端中间状态，前端暂不增加独立的长期 invited 管理 UI；保留现有邀请列表、接受/拒绝等逻辑，成员刷新时允许短暂显示该状态。
- 外部署名新增、绑定注册用户和 `MEMBER_MERGE_REQUIRED` 合并使用明确的独立操作；绑定前必须选择并确认目标用户。版本冲突、重复成员和部分成功批次需保留草稿并允许刷新后重试。

### 团队成员和标签策略

- 团队成员管理同样采用左右分栏：左侧成员卡片，右侧配置菜单；展示并编辑 `baseTag`、团队标签、工作人员资格和团队 alias。
- 站点 alias 在团队成员详情中只读展示，不提供修改入口；站点 alias 仍只能在 `/dashboard/user/setting/base` 修改。团队 alias 暂不增加独立入口，只能在团队成员管理中修改：成员本人可以修改自己的 alias，团队 creator/admin 可以修改其他成员的 alias，其他成员不能修改他人 alias。
- 团队标签策略页区分团队标签、项目标签、系统标签、团队覆盖和只读默认策略；系统标签可由团队覆盖权限配置，配置底部提供“还原为初始权限”；自定义标签提供删除按钮，并在被使用时显示不可删除原因。
- 项目创建/编辑表单中旧 `defaultRole`/`systemRole` 控件替换成什么；新成员默认 `baseTag=member` 如何向用户解释。

### 邀请、申请和 alias

- 邀请和申请继续保留现有逻辑，不新增长期 `invited` 状态管理界面；旧 `role`/`role_id` 不作为新身份配置项展示。
- 快捷窗口只提供跳转，项目 `displayName` 只能在 `/setting/member` 的成员详情中编辑。
- 注册用户、外部署名、团队 alias 和站点 alias 需要有明确的视觉区分；站点 alias 仍跳转到个人设置编辑，团队 alias 在团队成员详情中编辑。

### 洞察和统计

- 保留现有“成员统计”和“项目统计”两张表的布局、分页和项目展开交互，不新增第三种身份视图。
- 成员统计中的身份列显示 `displayName`、注册用户名称或外部署名，并显示项目标签摘要、团队 `baseTag`/团队标签摘要和成员状态；完全移除 `user.role.name` 展示。
- 项目统计中的项目身份信息显示项目成员摘要、标签摘要和项目状态；完全移除 `project.role.name` 和 `workers` 展示。项目状态沿用项目列表的三状态视觉规则。
- 外部署名没有 `userId` 时仍作为独立成员统计，显示“外部署名”标识和项目 `displayName`；不能链接到用户详情，也不能因缺少用户账号而从统计中静默丢弃。
- 洞察接口如果暂时仍返回旧字段，API 类型和适配层负责兼容读取；组件禁止直接访问 `role`/`workers`。洞察页面只展示新成员摘要，避免把兼容字段扩散到 UI。

### 请求错误和交互反馈

- 在 `src/apis/index.ts` 统一解析 HTTP 状态、嵌套 `error.code`、`message` 和 `request_id`，页面组件只接收规范化错误，不在每个页面重复判断旧数字错误码。
- 读取失败使用当前页面的错误状态；普通写入失败使用全局消息并保留用户编辑草稿；批量写入显示逐项成功/失败结果，不能用一个“全部失败”覆盖部分成功。
- `PROJECT_MEMBER_VERSION_CONFLICT`、`PROJECT_STATE_CONFLICT`：提示数据已更新，提供“刷新成员/刷新项目”按钮；刷新前保留未提交草稿，刷新后由用户决定是否重新应用。
- `MEMBER_ALREADY_EXISTS`：定位到已有成员卡片，不重复创建；`MEMBER_MERGE_REQUIRED`：打开绑定合并流程并要求明确选择保留的成员展示名、标签和关系。
- `NO_PERMISSION`：隐藏或禁用对应操作后仍可能出现的后端拒绝使用明确提示，不自动重试；`INVALID_IDENTITY_TAG`/资格不足：定位到标签选择器并显示不可用原因。
- `CLEAR_OPERATION_RETRYABLE`：保留项目清空中的状态，显示可重试按钮；重试使用同一操作上下文，完成前不显示为正常项目或可恢复项目。
- 网络错误和取消请求沿用现有全局错误机制；具有 `request_id` 的错误在详细提示或复制信息中提供请求编号，便于排查。
- 关键页面测试覆盖：成员快捷窗口 debounce 搜索和草稿合并、左右分栏成员编辑、三种项目状态、只读 viewer、部分成功批次、版本冲突刷新、绑定合并、标签策略恢复/删除和清空重试。

### UI 决策优先级

建议先确定项目状态/危险操作和项目成员管理，再确定项目卡片与工作人员展示，之后处理团队标签策略、邀请/申请、alias 和洞察。上述选择会直接影响权限显隐、成员编辑器和页面测试范围。
