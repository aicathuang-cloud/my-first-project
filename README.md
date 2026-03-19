# Task Status Indicator 🦐

OpenClaw 极简任务状态可视化工具。

```
[🦐 腾云虾] 正在执行: browser.snapshot | 已耗时 12s | 工具链: browser → eval
[████████░░] 步骤 3 | 最后活动: 2s 前
```

## 快速开始

```bash
# 1. 安装
./install.sh

# 2. 使用
node openclaw-status-wrap.js

# 或使用别名（安装时设置）
ocs
```

## 文件说明

| 文件 | 用途 |
|------|------|
| `openclaw-status-wrap.js` | 主入口 - 包装器模式 |
| `status-renderer.js` | 状态条渲染引擎 |
| `task-monitor.js` | 独立监控器（备用） |
| `install.sh` | 安装脚本 |
| `test.js` | 单元测试 |

## 工作原理

包装器拦截 OpenClaw 的输出，解析工具调用事件，实时更新终端底部的状态条。

```
用户输入 → [包装器] → OpenClaw
              ↓
         解析输出 → 更新状态条
```

## 状态条格式

- **运行中**: 显示工具名、耗时、工具链、步骤、进度条
- **完成**: ✅ 定格显示耗时和步骤数
- **失败**: ❌ 显示错误类型

## 自定义

编辑 `status-renderer.js` 修改：
- 表情符号 (`emoji`)
- 名字 (`agentName`)
- 刷新间隔 (`refreshIntervalMs`)
- 脉冲阈值 (`pulseThresholdMs`)
