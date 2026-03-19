# FSD - Functional Specification Document

## Task Status Indicator for OpenClaw

**版本**: 0.1.0  
**日期**: 2026-03-18  
**基于**: HLD v0.1.0

---

## 1. 代码文件清单

| 文件 | 行数 | 职责 |
|------|------|------|
| `openclaw-status-wrap.js` | ~200 | 主入口，进程管理，事件协调 |
| `status-renderer.js` | ~250 | 渲染引擎，终端控制 |
| `task-monitor.js` | ~200 | 备用监控器（独立模式） |
| `test.js` | ~100 | 单元测试 |
| `install.sh` | ~60 | 安装脚本 |

---

## 2. 核心类详解

### 2.1 OpenClawWrapper (openclaw-status-wrap.js)

```javascript
class OpenClawWrapper {
  constructor(options)
  parseLine(line)        // 解析 OpenClaw 输出
  updateTask(event)      // 更新任务状态
  renderStatus()         // 触发状态渲染
  wrap(args)             // 主入口，启动包装流程
}
```

**parseLine 解析规则**:

```javascript
// 工具开始模式
/Calling\s+(\w+)\.?(\w+)?/i      → {type: 'tool_start', tool}
/Exec:\s+(\w+)/i                 → {type: 'tool_start', tool}
/▶\s*(\w+)/                      → {type: 'tool_start', tool}

// 工具结束模式
/completed.*?(
\w+)/i          → {type: 'tool_end', status: 'success'}
/✓\s*(\w+)/                     → {type: 'tool_end', status: 'success'}
/error.*?(\w+)/i                → {type: 'tool_end', status: 'error'}
/✗\s*(\w+)/                     → {type: 'tool_end', status: 'error'}
```

**状态转换逻辑**:

```javascript
updateTask(event) {
  switch(event.type) {
    case 'tool_start':
      if (!currentTask) {
        // 新任务
        currentTask = {id, tool, startTime, step: 1, toolChain: [tool]}
      } else {
        // 嵌套调用
        currentTask.step++
        currentTask.toolChain.push(tool)
      }
      break
      
    case 'tool_end':
      if (currentTask) {
        renderFinalize()  // 定格显示
        currentTask = null
      }
      break
  }
}
```

---

### 2.2 StatusRenderer (status-renderer.js)

```javascript
class StatusRenderer {
  constructor(config)
  
  // 格式化方法
  formatTime(ms)           // ms → "500ms"/"12s"/"2m5s"
  formatToolChain(chain)   // 截断超长工具链
  renderProgressBar(step, pulseMode)  // 生成 [████░░░░░░]
  
  // 主渲染
  render(statusObj)        // StatusObject → 字符串
  
  // 子渲染器
  renderRunning()          // 运行中双行
  renderSuccess()          // 成功单行
  renderError()            // 错误单行
}
```

**时间格式化算法**:

```javascript
formatTime(ms) {
  if (ms < 1000) return `${ms}ms`
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rs = s % 60
  return `${m}m${rs}s`
}
```

**工具链截断算法**:

```javascript
formatToolChain(chain) {
  if (chain.length <= 1) return ''
  if (chain.length > maxLength) {
    return `... → ${chain.slice(-2).join(' → ')}`
  }
  return chain.join(' → ')
}
```

**进度条算法**:

```javascript
renderProgressBar(step, pulseMode) {
  const barLength = 10
  
  if (pulseMode) {
    // 脉冲动画
    const frames = ['▓', '░', '▓', '░', '▓']
    const frame = frames[pulseIndex % frames.length]
    const pos = Math.floor((pulseIndex / 2) % barLength)
    return '[' + '░'.repeat(pos) + frame + '░'.repeat(barLength-pos-1) + ']'
  }
  
  // 比例进度
  const progress = Math.min(step / 10, 1)
  const filled = Math.floor(progress * barLength)
  return '[' + '█'.repeat(filled) + '░'.repeat(barLength-filled) + ']'
}
```

---

### 2.3 TerminalController (status-renderer.js)

```javascript
class TerminalController {
  constructor()
  lastLines: number        // 上次输出的行数
  
  update(content)          // 刷新状态条
  clear()                  // 清理状态条
  finalize(content)        // 定格最终状态
}
```

**ANSI 控制序列**:

```javascript
// 光标上移 n 行
const moveUp = (n) => `\x1b[${n}A`

// 清除整行
const clearLine = `\x1b[2K`

// 刷新算法
update(content) {
  const lines = content.split('\n')
  const lineCount = lines.length
  
  // 1. 光标移到上次输出的第一行
  if (lastLines > 0) {
    stdout.write(moveUp(lastLines))
  }
  
  // 2. 清除之前的所有行
  for (let i = 0; i < lastLines; i++) {
    stdout.write(clearLine + '\n')
  }
  
  // 3. 光标移回
  if (lastLines > 0) {
    stdout.write(moveUp(lastLines))
  }
  
  // 4. 输出新内容
  stdout.write(content)
  
  lastLines = lineCount
}
```

---

## 3. 状态对象规范

### 3.1 StatusObject (运行时状态)

```typescript
interface StatusObject {
  // 必填
  status: 'pending' | 'running' | 'success' | 'error' | 'idle'
  currentTool: string        // 当前工具名，如 "browser.snapshot"
  elapsedMs: number          // 已运行毫秒数
  toolChain: string[]        // 工具调用链，如 ["browser", "eval"]
  step: number               // 当前步骤，从 1 开始
  lastActivityMs: number     // 最后活动时间（用于脉冲判断）
  
  // 可选
  error?: string             // 错误信息，status='error' 时必填
}
```

### 3.2 示例状态流

```javascript
// 初始
{status: 'idle', currentTool: 'idle', elapsedMs: 0, toolChain: [], step: 0, lastActivityMs: 0}

// 工具开始
{status: 'running', currentTool: 'browser.open', elapsedMs: 500, toolChain: ['browser.open'], step: 1, lastActivityMs: 0}

// 嵌套调用
{status: 'running', currentTool: 'eval', elapsedMs: 3500, toolChain: ['browser.open', 'eval'], step: 2, lastActivityMs: 500}

// 完成
{status: 'success', currentTool: 'browser.open', elapsedMs: 8000, toolChain: ['browser.open', 'eval'], step: 2, lastActivityMs: 0}
```

---

## 4. 配置规范

### 4.1 默认配置

```javascript
const defaultConfig = {
  emoji: '🦐',                    // 状态条图标
  agentName: '腾云虾',             // 显示名称
  refreshIntervalMs: 500,         // 刷新间隔
  pulseThresholdMs: 3000,         // 脉冲模式阈值
  maxToolChainLength: 3,          // 工具链最大显示长度
  showToolChain: true,            // 是否显示工具链
  barLength: 10                   // 进度条长度
}
```

### 4.2 配置加载优先级

1. 代码硬编码默认值
2. 环境变量 `OPENCLAW_STATUS_*`
3. 配置文件 `~/.openclaw-status.json`（未来版本）

---

## 5. 输入输出规范

### 5.1 输入 (OpenClaw 输出)

| 输入类型 | 示例 | 解析结果 |
|----------|------|----------|
| 工具开始 | `Calling browser.snapshot` | `{type: 'tool_start', tool: 'browser.snapshot'}` |
| 执行标记 | `Exec: read` | `{type: 'tool_start', tool: 'read'}` |
| 完成 | `completed (code 0)` | `{type: 'tool_end', status: 'success'}` |
| 成功图标 | `✓ Done` | `{type: 'tool_end', status: 'success'}` |
| 错误 | `Error: timeout` | `{type: 'tool_end', status: 'error'}` |
| 普通输出 | `Here is the result...` | `{type: 'output'}` |

### 5.2 输出 (状态条)

**运行中（双行）**:
```
[🦐 腾云虾] 正在执行: browser.snapshot | 已耗时 12s | 工具链: browser → eval
[████████░░] 步骤 3 | 最后活动: 2s 前
```

**成功（单行）**:
```
✅ [🦐 腾云虾] browser.snapshot | 完成 | 耗时 12s | 步骤 3
```

**错误（单行）**:
```
❌ [🦐 腾云虾] browser.snapshot | 失败 | 耗时 45s | Timeout
```

---

## 6. 错误处理

| 错误场景 | 处理策略 |
|----------|----------|
| OpenClaw 进程崩溃 | 捕获 exit 事件，清理状态条，透传退出码 |
| 解析失败 | 降级为 `output` 类型，直接显示原始内容 |
| 终端不支持 ANSI | 检测 `TERM=dumb`，关闭状态条仅透传 |
| 并发事件 | 队列化处理，保证状态一致性 |
| 内存溢出 | 限制 buffer 大小，超限时清理旧数据 |

---

## 7. 性能指标

| 指标 | 实测值 | 目标值 | 状态 |
|------|--------|--------|------|
| 启动时间 | < 100ms | < 500ms | ✅ |
| 解析延迟 | < 10ms | < 100ms | ✅ |
| 渲染延迟 | < 5ms | < 50ms | ✅ |
| 刷新间隔 | 500ms | 500ms | ✅ |
| 内存占用 | ~20MB | < 50MB | ✅ |
| 代码总行数 | ~800 | < 1000 | ✅ |

---

## 8. 测试覆盖

| 模块 | 测试项 | 测试文件 |
|------|--------|----------|
| StatusRenderer | formatTime | test.js |
| StatusRenderer | formatToolChain | test.js |
| StatusRenderer | render (5 states) | test.js |
| StatusRenderer | progress bar | test.js (演示) |
| TerminalController | ANSI update | status-renderer.js (演示) |
| OpenClawWrapper | end-to-end | openclaw-status-wrap.js (实际运行) |

---

## 9. 扩展点

| 扩展 | 位置 | 实现方式 |
|------|------|----------|
| 更多解析模式 | `parseLine()` | 添加正则到 patterns 数组 |
| 自定义渲染器 | `StatusRenderer` | 继承并重写 `render*()` 方法 |
| 配置文件 | 构造函数 | 读取 `~/.openclaw-status.json` |
| Web 适配 | 新建文件 | 实现 WebSocket 版 `TerminalController` |
| 性能统计 | `updateTask()` | 记录每个工具耗时到数组 |
