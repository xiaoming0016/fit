# 训练记录应用模块架构说明

本文档用于说明当前代码架构、模块职责、扩展方式与兼容策略，确保后续持续加功能时保持可维护性。

## 1. 架构目标

- **可扩展**：新增功能时尽量新增模块，而不是堆在 `main.ts`
- **可维护**：职责单一，改动范围可控
- **可测试**：业务逻辑与渲染/事件分离
- **可兼容**：保证历史本地数据、云端数据、页面行为平滑升级

## 2. 目录结构（当前）

```txt
src/
  actions/
    auth-actions.ts
    workout-actions.ts
    session-actions.ts
  events/
    bindings.ts
  render/
    views.ts
  services/
    cloud-sync.ts
  state/
    storage.ts
  utils/
    common.ts
    workout.ts
  app-context.ts
  data.ts
  types.ts
  main.ts
```

## 3. 模块职责

### `src/main.ts`（wiring / 组装层）

- 负责初始化应用与依赖注入
- 组装 `actions`、`services`、`render`、`events`
- 保存全局运行状态（`state`/`ui`）并提供 getter/setter
- **不建议再堆业务细节**

### `src/types.ts`（类型中心）

- 全局领域模型定义：
  - 动作、计划、草稿、历史、UI 状态
- 新增字段优先改这里，再改实现

### `src/data.ts`（静态配置）

- `APP_CONFIG`
- `SYSTEM_EXERCISES`
- `PLAN_DAYS`
- 新计划、新系统动作先改这里

### `src/state/storage.ts`（本地状态与迁移）

- localStorage 读写
- 历史数据迁移（兼容旧 schema）
- 统一状态 normalize

> 任何会影响存档结构的变更，都必须先评估并更新此模块。

### `src/services/cloud-sync.ts`（云同步服务）

- 拉取云端状态
- 保存云端状态
- 同步排队与节流
- 云端重建本地缓存

### `src/actions/*`（业务动作层）

- `auth-actions.ts`: 登录/注册提交流程
- `workout-actions.ts`: 草稿编辑动作（加组/删组/改值/加动作）
- `session-actions.ts`: 会话动作（完成训练/休息/保存动作配置/导出）

> 原则：动作层关注“业务结果”，不直接绑定 DOM 事件。

### `src/render/views.ts`（视图层）

- 输出各页面、弹窗 HTML 字符串
- 不直接更新 state
- 通过参数驱动渲染，尽量保持纯函数

### `src/events/bindings.ts`（事件分发层）

- 统一绑定全局 DOM 事件
- 将 `data-action` 事件分发到 actions/service 回调
- 不承载复杂业务逻辑

### `src/utils/*`（工具层）

- `common.ts`: 字符串/日期/展示等通用函数
- `workout.ts`: 训练数据工具（set 规范化等）

### `src/app-context.ts`（页面上下文）

- 统一获取根节点
- 缺失节点时 fail-fast（快速报错）

## 4. 调用关系（简化）

1. `main.ts` 初始化 `state/ui`
2. `main.ts` 组装 actions/services/render
3. `main.ts` 调 `bindGlobalEvents(...)`
4. 用户交互触发事件 -> `events/bindings.ts`
5. 分发到 `actions` 或 `services`
6. 变更 `state/ui` 后调用 `render*`
7. 必要时 `storage/cloud-sync` 持久化

## 5. 新功能扩展规范

后续新增功能，建议按以下顺序：

1. **先建类型**
   - 在 `types.ts` 增加模型/字段
2. **再定数据源**
   - 静态数据放 `data.ts`
   - 动态状态放 `state`
3. **再做业务动作**
   - 新建或扩展 `actions/*`
4. **再做渲染**
   - 在 `render/views.ts` 增加对应视图函数
5. **最后接线**
   - 在 `main.ts` 注入依赖
   - 在 `events/bindings.ts` 增加事件映射

### 新增功能模板（建议）

- `types.ts`：定义领域模型
- `actions/xxx-actions.ts`：业务动作
- `render/views.ts`：页面/弹窗渲染
- `events/bindings.ts`：事件映射
- `main.ts`：依赖组装

## 6. 兼容策略（必须遵守）

### 6.1 本地存储兼容

- 不要直接修改旧数据结构后立即强依赖新字段
- 每次 schema 变化都要在 `state/storage.ts` 做 normalize/migrate
- 对可缺失字段提供默认值

### 6.2 云端兼容

- 云端状态拉取后必须走 normalize
- 云端空值或旧格式要能回退到默认状态

### 6.3 UI 兼容

- 事件 `data-action` 名称尽量保持稳定
- 动作按钮含义不要无声变化

## 7. 建议的后续拆分方向

当功能继续增长时，可以进一步拆分：

- `render/` 按页面拆分：`render/auth.ts`、`render/training.ts`、`render/modal.ts`
- `state/` 增加 `selectors.ts`（减少重复读取逻辑）
- `actions/` 增加 `library-actions.ts`（动作库管理独立）

## 8. 开发检查清单（每次功能迭代）

- [ ] `npm run typecheck` 通过
- [ ] `npm run build` 通过
- [ ] 本地已登录流程正常
- [ ] 训练流程（开始、记录、完成）正常
- [ ] 历史记录与导出正常
- [ ] 新老本地数据都能加载（兼容）

---

如果后续新增的是“较大功能”（例如周期计划编辑器、统计图表、提醒系统），建议先补一份 mini-PRD 到 `doc/`，再按本架构逐层落地。
