---
id: "10649f83-8e33-4f42-aa00-45396c3b9262"
title: "dsh volatile 字段致 Host apply() 崩溃的诊断与修复教训"
description: "2026-10 排障记录：.volatile() 字段以 Volatile<T> 引用传入 apply() 导致 fiber 启动失败、设置页显示\"不可用\"的完整因果链、诊断方法与修复模式（含热生效开关）。"
status: "active"
created_at: "2026-10-12T04:13:01.980Z"
updated_at: "2026-10-12T04:13:01.980Z"
content_hash: "01c3792d5d0d4d93de40350b17c6ea60d0c3c2ed15ed1a62698c95a808b239d1"
source_paths:
  - "lib/index.js"
  - "lib/client.js"
  - "cordis.patch.yml"
  - "package.json"
  - "README.md"
session_ids:
  - "session-962a8297-a320-45da-9c7b-f5f7fd91f8d1"
memory_body_ids:
  []
---

# dsh volatile 字段致 Host apply() 崩溃的诊断与修复教训

工作区 `E:\Documents\ai-home\dsh-tool-comfyui`，DSH 0.2.0-rc.2。相关文档：
[settings card 交接](092d069c-6ecc-4fdc-988c-1179d52ea0be)（其"owner props 直接提供 form"的契约描述已过时——现行官方模式是 controller + `SettingsFormModel` + `ctx.configForms` inject face，见 `lib/client.js`）。

## 症状

设置界面 ComfyUI 页显示"当前部署未向此客户端提供该配置"，三个 comfyui 工具从工具列表消失，插件状态异常——但组合、安装、模块加载全部看似正常。

## 因果链（已逐环验证）

1. 上一轮给 `Config` 全部 10 个字段加了 `.volatile()`（设置服务的 `describe()` 只投影 volatile 字段，不加就不出现在 UI）。
2. **dsh rc.1 契约：Loader 传给 Host 插件 `apply(ctx, config)` 的 volatile 字段不是值，而是 `Volatile<T>` 实时引用**——`{get, set}` 函数属性的普通对象（`JSON.stringify` 跳过函数值 → 全部显示为 `{}`；schemastery `createVolatile()` 实现包装）。dsh-free-search 源码 3074/3241 行注释明确记载此契约。
3. `apply()` 把引用当字符串调 `resolve(config.workflowsDir)` → `ERR_INVALID_ARG_TYPE` → fiber 启动崩溃（state≠2）。
4. `dsh-settings.describe()` 的准入条件是 `fiber.state === 2` → 崩溃的条目被整体跳过 → 客户端镜像没有该命名空间 → 表单渲染 `labels.unavailable`；同源导致工具不注册。

一个症状（不可用 + 工具消失）来自同一个根因，`describe()` 与 `Tool.listTools` 是互相印证的活体探针。

## 诊断方法（下次直接用）

- **`plugin_manager set_bundle` 先 `enabled:false` 再 `true`**：Loader 会给出该条目启动失败的**精确错误栈**（这是突破口——比读日志、猜组合快得多）。
- **在 `apply()` 顶部写诊断快照到工作区文件**：`JSON.stringify(config)` 一眼看出值的形态（全 `{}` = 引用包装）。
- **注意 Node ESM 缓存按 URL 命中**：改 `lib/index.js` 后 disable/enable **不会**加载新代码（栈行号不变可证实）；宿主代码改动必须**重启 web profile**，仅客户端 `lib/client.js` 改动刷新页面即可。
- `cordis_inspect_query` 带 `input` 参数在此 harness 构建中损坏（报 `"input" must be an object`）——只能省略 input 用无参方法。

## 修复模式（已在本插件落地并模拟验证）

```js
function unwrapVolatile(config) {           // dsh-free-search 官方模式
  const plain = {};
  for (const [key, value] of Object.entries(config))
    plain[key] = value !== null && typeof value === "object"
      && typeof value.get === "function" ? value.get() : value;
  return plain;
}
function apply(ctx, config) {
  const current = () => unwrapVolatile(config);   // 每次读取解包 → 设置改动无需重启生效
  ...
}
```

- 值类参数（workers、目录、超时、轮询、批量）在工具 `execute()` 内经 `current()` 读取 → 保存即生效。
- **注册类开关（generate/status/queue）**：注册改为可重调用函数 + `gates` disposer 表（`ctx.tools.register` 返回注销 disposer），监听 **`ctx.on("loader/volatile-update", ...)`**（dsh-mnemon 先例；`paths` 为路径数组，`path[0]` 是字段名）重跑 `syncTools()` → 开关切换即时注册/注销。volatile 更新永不重挂载 fiber，不接此事件则开关保存后需重启才生效。
- 验证方式：模拟带 `{get()}` 引用的 config 调 `apply`（复现原崩溃点）+ 翻转引用后手动派发 `loader/volatile-update` 断言工具增删。

## 组合与命名空间备忘

- settings 命名空间 = patch 行**裸 id**（`tool-comfyui`，无 `include:` 前缀）——`configEditor.configuration()` 全部按裸 id 匹配补丁，profile 补丁 `- id: agent-default-model` 的覆盖生效即为实证；`Config.listConfigs`/`list_bundles` 返回的 `include:` 前缀只是目录地址。
- 设置导航栏 = 客户端向 **`settings.section`** 槽注册 `{name, id, order, label, locale, inject}`，组件拿 owner props `{close}`；无条件注册（不要用 `whileServed` 门控，否则命名空间未就绪时整栏消失，应由表单显示 unavailable 文案）。
- `install_bundle` 报 `ambiguous-install` 但 pnpm exitCode 0：link: 已存在时是良性冲突，运行的就是工作区代码。
