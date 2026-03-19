#!/usr/bin/env node
/**
 * Task Status Monitor - 轮询监控器
 * 变通方案：轮询检测 OpenClaw 工具调用状态
 */

const { StatusRenderer, TerminalController } = require('./status-renderer');
const fs = require('fs');
const path = require('path');

class TaskMonitor {
  constructor(options = {}) {
    this.config = {
      refreshIntervalMs: options.refreshIntervalMs || 500,
      stateFilePath: options.stateFilePath || this.getDefaultStatePath(),
      ...options
    };
    
    this.renderer = new StatusRenderer(options);
    this.terminal = new TerminalController();
    
    this.isRunning = false;
    this.timer = null;
    this.currentTask = null;
    
    // 绑定退出处理
    this.handleExit = this.handleExit.bind(this);
    process.on('SIGINT', this.handleExit);
    process.on('SIGTERM', this.handleExit);
  }

  getDefaultStatePath() {
    // 尝试找 OpenClaw 状态文件
    const possiblePaths = [
      path.join(process.env.HOME, '.openclaw', 'runtime', 'session-state.json'),
      path.join(process.env.HOME, '.openclaw', 'state', 'tools-active.json'),
      '/tmp/openclaw-session-state.json'
    ];
    
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) return p;
    }
    
    return possiblePaths[0]; // 默认返回第一个
  }

  /**
   * 读取 OpenClaw 当前状态
   * 这是一个模拟实现，实际需要根据 OpenClaw 的暴露方式调整
   */
  readOpenClawState() {
    try {
      // 方案1：读取状态文件（如果 OpenClaw 会写入）
      if (fs.existsSync(this.config.stateFilePath)) {
        const data = fs.readFileSync(this.config.stateFilePath, 'utf8');
        return JSON.parse(data);
      }
      
      // 方案2：通过环境变量或进程间通信获取
      // 这里先返回一个模拟状态用于演示
      return this.getMockState();
    } catch (err) {
      return { status: 'idle' };
    }
  }

  /**
   * 模拟状态（用于演示和测试）
   */
  getMockState() {
    // 实际实现中，这里应该通过某种方式读取 OpenClaw 的真实状态
    // 可能的方式：
    // 1. 读取 OpenClaw 的日志文件解析
    // 2. 通过 HTTP 接口查询（如果 OpenClaw 暴露了 API）
    // 3. 通过进程间通信（IPC）
    // 4. 包装 OpenClaw 命令，拦截输出
    
    return {
      status: 'idle',
      activeTools: [],
      lastToolCall: null
    };
  }

  /**
   * 检查是否有活跃的工具调用
   */
  checkActiveTools() {
    const state = this.readOpenClawState();
    
    if (state.activeTools && state.activeTools.length > 0) {
      return state.activeTools[0]; // 返回当前活跃的工具
    }
    
    return null;
  }

  /**
   * 更新状态显示
   */
  tick() {
    const activeTool = this.checkActiveTools();
    
    if (activeTool) {
      // 有活跃任务
      if (!this.currentTask || this.currentTask.id !== activeTool.id) {
        // 新任务开始
        this.currentTask = {
          id: activeTool.id,
          tool: activeTool.name,
          startTime: Date.now(),
          step: 1,
          toolChain: [activeTool.name]
        };
      } else {
        // 更新现有任务
        this.currentTask.step++;
        if (!this.currentTask.toolChain.includes(activeTool.name)) {
          this.currentTask.toolChain.push(activeTool.name);
        }
      }
      
      const elapsed = Date.now() - this.currentTask.startTime;
      const lastActivity = activeTool.lastActivity ? 
        Date.now() - activeTool.lastActivity : 0;
      
      const statusObj = {
        status: 'running',
        currentTool: this.currentTask.tool,
        elapsedMs: elapsed,
        toolChain: this.currentTask.toolChain,
        step: this.currentTask.step,
        lastActivityMs: lastActivity || elapsed % 3000 // 模拟
      };
      
      const rendered = this.renderer.render(statusObj);
      this.terminal.update(rendered);
      
    } else if (this.currentTask) {
      // 任务结束
      const elapsed = Date.now() - this.currentTask.startTime;
      const statusObj = {
        status: 'success',
        currentTool: this.currentTask.tool,
        elapsedMs: elapsed,
        step: this.currentTask.step
      };
      
      const rendered = this.renderer.render(statusObj);
      this.terminal.finalize(rendered);
      this.currentTask = null;
    }
  }

  /**
   * 启动监控
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('Task Status Monitor 启动...');
    console.log('按 Ctrl+C 停止\n');
    
    this.timer = setInterval(() => this.tick(), this.config.refreshIntervalMs);
  }

  /**
   * 停止监控
   */
  stop() {
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.terminal.clear();
    console.log('\n监控已停止');
  }

  /**
   * 退出处理
   */
  handleExit() {
    this.stop();
    process.exit(0);
  }
}

// 导出
module.exports = { TaskMonitor };

// 直接运行
if (require.main === module) {
  const monitor = new TaskMonitor();
  
  // 演示模式：模拟有任务在运行
  console.log('=== 演示模式 ===');
  console.log('实际使用时需要接入 OpenClaw 真实状态\n');
  
  // 创建模拟状态文件
  const mockStatePath = '/tmp/openclaw-session-state.json';
  let step = 0;
  let startTime = Date.now();
  
  // 启动模拟状态生成
  const mockInterval = setInterval(() => {
    step++;
    const mockState = {
      activeTools: [{
        id: 'task-001',
        name: step % 3 === 0 ? 'browser.snapshot' : (step % 3 === 1 ? 'eval' : 'write'),
        startTime: startTime,
        lastActivity: Date.now()
      }],
      step: step
    };
    
    fs.writeFileSync(mockStatePath, JSON.stringify(mockState));
    
    if (step > 20) {
      clearInterval(mockInterval);
      fs.unlinkSync(mockStatePath);
      console.log('\n演示结束');
      monitor.stop();
      process.exit(0);
    }
  }, 1000);
  
  // 设置状态文件路径并启动
  monitor.config.stateFilePath = mockStatePath;
  monitor.start();
}
