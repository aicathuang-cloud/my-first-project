#!/usr/bin/env node
/**
 * Task Status Indicator - OpenClaw 专用包装器
 * 拦截 OpenClaw 输出，实时显示状态条
 * 
 * 用法: ./openclaw-status-wrap.js [openclaw命令参数...]
 * 示例: ./openclaw-status-wrap.js
 *       ./openclaw-status-wrap.js --verbose
 */

const { spawn } = require('child_process');
const { StatusRenderer, TerminalController } = require('./status-renderer');
const readline = require('readline');
const path = require('path');

class OpenClawWrapper {
  constructor(options = {}) {
    this.renderer = new StatusRenderer(options);
    this.terminal = new TerminalController();
    
    this.currentTask = null;
    this.isRunning = false;
    this.lastActivityTime = Date.now();
    this.outputBuffer = '';
    
    // ANSI 颜色码正则
    this.ansiRegex = /\x1b\[[0-9;]*m/g;
    
    // OpenClaw 输出模式
    this.initPatterns();
  }

  initPatterns() {
    // 工具调用模式 - OpenClaw 实际输出格式
    this.toolStartPatterns = [
      /Calling\s+(\w+)\.?(\w+)?/i,
      /Exec:\s+(\w+)/i,
      /▶\s*(\w+)/,
      /正在调用[：:]\s*(\w+)/i,
      /\[(\w+)\]\s*调用中/i,
      /tool:\s*(\w+)/i,
      /Running\s+(\w+)/i,
      /Executing\s+(\w+)/i
    ];
    
    // 工具完成模式
    this.toolEndPatterns = [
      /completed.*?(\w+)/i,
      /✓\s*(\w+)/,
      /完成[：:]\s*(\w+)/i,
      /Result.*?(\w+)/i,
      /✅.*?(\w+)/i,
      /done/i
    ];
    
    // 错误模式
    this.errorPatterns = [
      /error.*?(\w+)/i,
      /✗\s*(\w+)/,
      /失败[：:]\s*(\w+)/i,
      /failed/i,
      /❌/i
    ];
    
    // Agent活动模式 - 当有输出时认为agent在工作
    this.agentActivityPatterns = [
      /^[🦞🐲🤖]/,  // OpenClaw emoji
      /^\[/,         // [模块名]
      /^🎯/,
      /^💭/,
      /^🔧/,
      /^📥/,
      /^📤/
    ];
  }

  /**
   * 解析单行输出
   */
  parseLine(line) {
    const cleanLine = line.replace(this.ansiRegex, '').trim();
    
    if (!cleanLine) return null;
    
    // 检查工具开始
    for (const pattern of this.toolStartPatterns) {
      const match = cleanLine.match(pattern);
      if (match) {
        const toolName = match[2] ? `${match[1]}.${match[2]}` : match[1];
        return { type: 'tool_start', tool: toolName, raw: line };
      }
    }
    
    // 检查工具完成
    for (const pattern of this.toolEndPatterns) {
      if (pattern.test(cleanLine)) {
        return { type: 'tool_end', status: 'success', raw: line };
      }
    }
    
    // 检查错误
    for (const pattern of this.errorPatterns) {
      if (pattern.test(cleanLine)) {
        return { type: 'tool_end', status: 'error', raw: line };
      }
    }
    
    // 检查Agent活动 - 任何有意义的输出都表示agent正在工作
    for (const pattern of this.agentActivityPatterns) {
      if (pattern.test(cleanLine)) {
        return { type: 'agent_activity', raw: line };
      }
    }
    
    // 检查消息输出（用户可见的回复）
    if (cleanLine.length > 10 && !cleanLine.startsWith('{')) {
      return { type: 'message', raw: line };
    }
    
    return { type: 'output', raw: line };
  }

  /**
   * 更新任务状态
   */
  updateTask(event) {
    const now = Date.now();
    
    switch (event.type) {
      case 'tool_start':
        if (!this.currentTask) {
          this.currentTask = {
            id: `task-${now}`,
            tool: event.tool,
            startTime: now,
            step: 1,
            toolChain: [event.tool]
          };
        } else {
          this.currentTask.step++;
          if (!this.currentTask.toolChain.includes(event.tool)) {
            this.currentTask.toolChain.push(event.tool);
          }
          this.currentTask.tool = event.tool;
        }
        this.isRunning = true;
        this.lastActivityTime = now;
        break;
        
      case 'tool_end':
        if (this.currentTask) {
          const elapsed = now - this.currentTask.startTime;
          const statusObj = {
            status: event.status,
            currentTool: this.currentTask.tool,
            elapsedMs: elapsed,
            step: this.currentTask.step
          };
          
          // 定格显示完成状态
          const rendered = this.renderer.render(statusObj);
          this.terminal.finalize(rendered);
          
          // 重置任务
          this.currentTask = null;
          this.isRunning = false;
        }
        break;
        
      case 'agent_activity':
      case 'message':
        this.lastActivityTime = now;
        if (!this.currentTask) {
          // 开始新任务 - agent正在思考或输出
          this.currentTask = {
            id: `task-${now}`,
            tool: '🤖 Agent',
            startTime: now,
            step: 1,
            toolChain: ['🤖']
          };
          this.isRunning = true;
        }
        break;
    }
  }

  /**
   * 渲染当前状态
   */
  renderStatus() {
    if (!this.currentTask || !this.isRunning) return;
    
    const now = Date.now();
    const elapsed = now - this.currentTask.startTime;
    const lastActivity = now - this.lastActivityTime;
    
    // 超过3秒没有新输出，切换到脉冲模式
    const pulseMode = lastActivity > 3000;
    
    const statusObj = {
      status: 'running',
      currentTool: this.currentTask.tool,
      elapsedMs: elapsed,
      toolChain: this.currentTask.toolChain,
      step: this.currentTask.step,
      lastActivityMs: lastActivity,
      pulseMode
    };
    
    const rendered = this.renderer.render(statusObj);
    this.terminal.update(rendered);
  }

  /**
   * 启动包装器
   */
  wrap(args = []) {
    console.log('🦞 Task Status Indicator 启动');
    console.log('按 Ctrl+C 退出\n');
    
    // 尝试找到openclaw命令
    const openclawPath = process.env.OPENCLAW_PATH || 'openclaw';
    
    // 构建命令参数 - 支持直接传入mjs文件路径
    let command = 'node';
    let cmdArgs;
    
    // 灵活路径检测
    const openclawPath = process.env.OPENCLAW_PATH;
    
    if (openclawPath) {
      // 用户自定义路径
      if (openclawPath.endsWith('.mjs') || openclawPath.endsWith('.js')) {
        command = 'node';
        cmdArgs = [openclawPath, 'agent', ...args];
      } else {
        command = openclawPath;
        cmdArgs = ['agent', ...args];
      }
    } else if (process.platform === 'win32') {
      // Windows默认路径 - QClaw
      const openclawMjs = 'C:\\Program Files\\QClaw\\resources\\openclaw\\node_modules\\openclaw\\openclaw.mjs';
      cmdArgs = [openclawMjs, 'agent', ...args];
    } else {
      // Linux/Mac: 尝试使用openclaw命令
      command = 'openclaw';
      cmdArgs = ['agent', ...args];
    }
    
    // 启动OpenClaw进程
    const openclaw = spawn(command, cmdArgs, {
      stdio: ['inherit', 'pipe', 'pipe'],
      env: { ...process.env }
    });
    
    console.log(`> ${command} ${cmdArgs.join(' ')}\n`);
    
    // 处理标准输出
    const stdoutRl = readline.createInterface({
      input: openclaw.stdout,
      crlfDelay: Infinity
    });
    
    stdoutRl.on('line', (line) => {
      const event = this.parseLine(line);
      
      // 忽略空行
      if (!event) {
        console.log(line);
        return;
      }
      
      // 更新状态
      this.updateTask(event);
      
      // 显示原始输出（清理ANSI转义序列）
      const cleanLine = line
        .replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')
        .replace(/\x1b\[[0-9;]*m/g, '')
        .replace(/\[2A\[2K/g, '')
        .replace(/\[2K/g, '')
        .trim();
      if (this.isRunning) {
        this.terminal.clear();
        if (cleanLine) console.log(cleanLine);
        this.renderStatus();
      } else {
        console.log(cleanLine);
      }
    });
    
    // 处理标准错误
    const stderrRl = readline.createInterface({
      input: openclaw.stderr,
      crlfDelay: Infinity
    });
    
    stderrRl.on('line', (line) => {
      if (this.isRunning) {
        this.terminal.clear();
      }
      console.error(line);
      if (this.isRunning) {
        this.renderStatus();
      }
    });
    
    // 启动状态刷新定时器
    const statusInterval = setInterval(() => {
      if (this.isRunning) {
        this.renderStatus();
      }
    }, 500);
    
    // 处理进程退出
    openclaw.on('close', (code) => {
      clearInterval(statusInterval);
      this.terminal.clear();
      console.log(`\nOpenClaw 退出 (code ${code})`);
      process.exit(code);
    });
    
    // 处理Ctrl+C
    process.on('SIGINT', () => {
      openclaw.kill('SIGINT');
    });
  }
}

// 主入口
const wrapper = new OpenClawWrapper();
const args = process.argv.slice(2);
wrapper.wrap(args);
