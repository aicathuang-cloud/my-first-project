---
name: task-status-indicator
description: 极简任务状态可视化终端工具。在终端底部显示实时状态条，让用户知道AI是在干活还是卡住了。适用于用户启动OpenClaw CLI时需要可视化任务进度和工具链状态的场景。
---

# Task Status Indicator

极简任务状态可视化 skill。在终端底部显示实时状态条，让用户知道 AI 是在干活还是卡住了。

## 效果

```
[🦐 腾云虾] 正在执行: browser.snapshot | 已耗时 12s | 工具链: browser → eval
[████████░░] 步骤 3 | 最后活动: 2s 前
```

## 快速开始（推荐）

### 一键安装

```bash
cd ~/.openclaw/workspace/skills/task-status-indicator
./install.sh
```

### 方法1：包装器模式（实时状态）

```bash
# 用包装器启动 OpenClaw，自动显示状态条
node ~/.openclaw/workspace/skills/task-status-indicator/openclaw-status-wrap.js

# 带参数启动
node ~/.openclaw/workspace/skills/task-status-indicator/openclaw-status-wrap.js --verbose
```

### 方法2：设置别名（更方便）

```bash
# 添加到 ~/.bashrc 或 ~/.zshrc
alias ocs='node ~/.openclaw/workspace/skills/task-status-indicator/openclaw-status-wrap.js'

# 然后直接使用
ocs
ocs --verbose
```

## 安装

```bash
# 1. 复制 skill 到 OpenClaw skills 目录
cp -r task-status-indicator ~/.openclaw/skills/

# 2. 在 OpenClaw 配置中启用
# 编辑 ~/.openclaw/config.yaml，添加:
# skills:
#   - task-status-indicator
```

## 使用

启动 OpenClaw 后会自动显示状态条。

### 配置项

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `refreshIntervalMs` | 500 | 刷新间隔（毫秒） |
| `pulseThresholdMs` | 3000 | 单步骤超时切换脉冲动画的阈值 |
| `showToolChain` | true | 是否显示工具链 |
| `maxToolChainLength` | 3 | 工具链最大显示长度，超出截断 |

## 状态条格式

**运行中：**
```
[🦐 腾云虾] 正在执行: {tool_name} | 已耗时 {elapsed} | 工具链: {chain}
[████████░░] 步骤 {step} | 最后活动: {activity}s 前
```

**完成：**
```
✅ [🦐 腾云虾] {tool_name} | 完成 | 耗时 {elapsed} | 步骤 {step}
```

**失败：**
```
❌ [🦐 腾云虾] {tool_name} | 失败 | 耗时 {elapsed} | {error_type}
```

## 工作原理

轮询方案：每 500ms 检查一次 OpenClaw 内部工具调用状态，生成 ANSI 状态条并通过 `\r` 回车符刷新同一行显示。
