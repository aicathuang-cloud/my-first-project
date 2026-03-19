# HLD - High-Level Design

## Task Status Indicator for OpenClaw

**版本**: 0.1.0  
**日期**: 2026-03-18  
**基于**: SRS v0.1.0

---

## 1. 架构总览

```
┌─────────────────────────────────────────────────────────────┐
│                      User Terminal                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
         ┌─────────────▼──────────────┐
         │   OpenClaw Status Wrapper  │
         │  (openclaw-status-wrap.js) │  ← 主入口，进程管理
         └─────────────┬──────────────┘
                       │
       ┌───────────────┼───────────────┐
       │               │               │
  ┌────▼────┐    ┌────▼────┐    ┌────▼──────┐
  │ Parser  │    │ Renderer│    │  Terminal │
  │ 模块    │    │ 模块    │    │ Controller│
  │         │    │         │    │           │
  │ 解析    │───→│ 状态    │───→│  ANSI     │
  │ 输出    │    │ 渲染    │    │  控制     │
  └────┬────┘    └─────────┘    └────┬──────┘
       │                              │
       └──────────────┬───────────────┘
                      │
         ┌────────────▼────────────┐
         │      OpenClaw Process   │
         │      (被包装的原进程)    │
         └─────────────────────────┘
```

---

## 2. 模块职责

### 2.1 Wrapper (包装器)
- **文件**: `openclaw-status-wrap.js`
- **职责**:
  - 启动 OpenClaw 子进程
  - 代理 stdin/stdout/stderr
  - 协调 Parser 和 Renderer
  - 管理状态刷新定时器
- **关键方法**:
  - `wrap(args)`: 启动包装流程
  - `parseLine(line)`: 调用 Parser
  - `updateTask(event)`: 更新内部状态

### 2.2 Parser (解析器)
- **位置**: 内置于 Wrapper
- **职责**:
  - 识别 OpenClaw 输出模式
  - 转换为标准化事件
- **识别模式**:
  - `Calling \w+` → tool_start
  - `completed` → tool_end (success)
  - `Error/failed` → tool_end (error)

### 2.3 Renderer (渲染器)
- **文件**: `status-renderer.js`
- **职责**:
  - StatusObject → ANSI 字符串
  - 时间管理、工具链格式化
  - 进度条生成（比例/脉冲）
- **关键方法**:
  - `render(statusObj)`: 主渲染
  - `formatTime(ms)`: 时间格式化
  - `renderProgressBar()`: 进度条

### 2.4 Terminal Controller
- **位置**: 内置于 `status-renderer.js`
- **职责**:
  - ANSI 光标控制
  - 行清理与重写
  - 最终状态定格

---

## 3. 数据流

### 3.1 正常运行流程

```
1. 用户输入 → Wrapper → OpenClaw
2. OpenClaw 输出 "Calling browser.open"
3. Parser 识别 → {type: 'tool_start', tool: 'browser.open'}
4. Wrapper 更新 currentTask
5. Renderer.render() → ANSI 字符串
6. TerminalController.update() → 显示状态条
7. 每 500ms 重复 5-6 步，更新 elapsed
8. OpenClaw 输出 "completed"
9. Parser 识别 → {type: 'tool_end', status: 'success'}
10. Renderer.render() + TerminalController.finalize()
11. 定格显示完成状态
```

### 3.2 数据转换

```
Raw Output (String)
       ↓
Parser.parseLine()
       ↓
ParseEvent {type, tool, status}
       ↓
Wrapper.updateTask()
       ↓
StatusObject {status, currentTool, elapsedMs, ...}
       ↓
Renderer.render()
       ↓
ANSI String (两行)
       ↓
TerminalController.update()
       ↓
Screen Display
```

---

## 4. 状态机

```
                    ┌──────────────────────────────────────┐
                    │                                      │
                    ▼                                      │
┌────────┐    tool_start    ┌─────────┐   tool_end/success ┌─────────┐
│  IDLE  │ ────────────────→│ RUNNING │ ──────────────────→│ SUCCESS │
└────────┘                  └─────────┘                    └─────────┘
   ▲                            │
   │                            │ tool_end/error
   │                            ▼
   │                         ┌─────────┐
   └─────────────────────────│  ERROR  │
        reset/new task       └─────────┘
```

### 状态定义

| 状态 | 触发条件 | 显示样式 |
|------|----------|----------|
| IDLE | 无活跃任务 | `[🦐 腾云虾] 就绪` |
| RUNNING | 检测到 tool_start | 双行动态状态条 |
| SUCCESS | 检测到 tool_end + success | 单行 ✅ 定格 |
| ERROR | 检测到 tool_end + error | 单行 ❌ 定格 |

---

## 5. 时序图

### 工具调用生命周期

```
User    Wrapper    Parser    Renderer    Terminal    OpenClaw
 │         │          │          │           │           │
 │────────►│          │          │           │           │
 │  cmd    │          │          │           │           │
 │         │────────────────────────────────────────────►│
 │         │                      │           │          │
 │         │◄────────────────────────────────────────────│
 │         │  "Calling browser"   │           │          │
 │         │          │          │           │          │
 │         │─────────►│          │           │          │
 │         │          │  parse   │           │          │
 │         │          │─────────►│           │          │
 │         │          │          │ render()  │          │
 │         │          │          │──────────►│          │
 │         │          │          │           │ update() │
 │         │          │          │           │─────────►│
 │         │          │          │           │ (screen) │
 │         │          │          │           │          │
 │         │◄────────────────────────────────────────────│
 │         │  "completed"         │           │          │
 │         │─────────►│          │           │          │
 │         │          │  parse   │           │          │
 │         │          │─────────►│           │          │
 │         │          │          │ render()  │          │
 │         │          │          │──────────►│          │
 │         │          │          │           │finalize()│
 │         │          │          │           │─────────►│
 │◄────────┤          │          │           │          │
 │ result  │          │          │           │          │
```

---

## 6. 部署架构

### 方案 C：包装器模式（最终选择）

```
┌─────────────────────────────────────┐
│           用户 Shell                 │
│  $ node openclaw-status-wrap.js     │
└──────────────┬──────────────────────┘
               │ fork
               ▼
┌─────────────────────────────────────┐
│      Wrapper Process (Node.js)      │
│  ┌─────────┐  ┌─────────┐           │
│  │  stdin  │  │ stdout  │◄──────────┤ 读取 OpenClaw 输出
│  │ 代理    │  │ 解析    │           │
│  └────┬────┘  └────┬────┘           │
│       │            │                │
│       └────────────┘                │
│            │                        │
│            ▼                        │
│  ┌─────────────────────┐            │
│  │   状态条渲染逻辑     │            │
│  └─────────────────────┘            │
└──────────────────┬──────────────────┘
                   │ spawn
                   ▼
┌─────────────────────────────────────┐
│       OpenClaw Process              │
│       (原生命令)                     │
└─────────────────────────────────────┘
```

**选择理由**:
- 零侵入 OpenClaw 源码
- 实时性最好（管道直连）
- 可扩展性强（未来可加更多功能）
- 失败安全（包装器崩溃不影响 OpenClaw）

---

## 7. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| OpenClaw 输出格式变更 | 解析失效 | 正则宽松匹配，多模式备选 |
| 终端不支持 ANSI | 显示乱码 | 检测 TERM 变量，自动降级 |
| 并发任务冲突 | 状态错乱 | 串行处理，队列机制 |
| 内存泄漏 | 长期运行崩溃 | 限制 buffer 大小，定期清理 |
