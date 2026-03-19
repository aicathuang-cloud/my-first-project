#!/usr/bin/env node
/**
 * Task Status Indicator - 简化版包装器
 * 拦截 OpenClaw 输出，实时显示状态条
 * 
 * 用法: ./openclaw-status-wrap.js [openclaw命令参数...]
 * 示例: ./openclaw-status-wrap.js
 *       ./openclaw-status-wrap.js --verbose
 */

const { spawn } = require('child_process');
const { StatusRenderer, TerminalController } = require('./status-renderer');
const readline = require('readline');

class OpenClawWrapper {
  constructor(options = {}) {
    this.renderer = new StatusRenderer(options);
    this.terminal = new TerminalController();
    
    this.currentTask = null;
    this.isRunning = false;
    this.buffer = '';
    
    // ANSI 颜色码正则（用于清理输出）
    this.ansiRegex = /\x1b\[[0-9;]*m/g;
  }

  /**
   * 解析 OpenClaw 输出，提取工具调用信息
   */
  parseLine(line) {
    const cleanLine = line.replace(this.ansiRegex, '').trim();
    
    // 模式1: 工具开始调用（通常是 "Calling" 或 "Exec:"）
    const startPatterns = [
      /Calling\s+(\w+)\.?(\w+)?/i,
      /Exec:\s+(\w+)/i,
      /▶\s*(\w+)/,
      /正在调用[：:]\s*(\w+)/i
    ];
    
    for (const pattern of startPatterns) {
      const match = cleanLine.match(pattern);
      if (match) {
        const toolName = match[2] ? `${match[1]}.${match[2]}` : match[1];
        return { type: 'tool_start', tool: toolName, raw: line };
      }
    }
    
    // 模式2: 工具完成
    const endPatterns = [
      /completed.*?(\w+)/i,
      /✓\s*(\w+)/,
      /完成[：:]\s*(\w+)/i,
      /Result.*?(\w+)/i
    ];
    
    for (const pattern of endPatterns) {
      const match = cleanLine.match(pattern);
      if (match) {
        return { type: 'tool_end', tool: match[1], status: 'success', raw: line };
      }
    }
    
    // 模式3: 工具错误
    const errorPatterns = [
      /error.*?(\w+)/i,
      /✗\s*(\w+)/,
      /失败[：:]\s*(\w+)/i,
      /failed/i
    ];
    
    for (const pattern of errorPatterns) {
      if (pattern.test(cleanLine)) {
        return { type: 'tool_end', status: 'error', raw: line };
      }
    }
    
    // 模式4: 推理/思考标记（一些模型会输出这些）
    if (cleanLine.includes('reasoning') || cleanLine.includes('思考')) {
      return { type: 'thinking', raw: line };
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
        }
        this.isRunning = true;
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
        
      case 'thinking':
        // 思考状态可以显示一个特殊标记
        if (!this.currentTask) {
          // 只有空闲时才显示思考标记
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
    
    // 估算最后活动时间（这里简化处理）
    const lastActivity = elapsed % 3000;
    
    const statusObj = {
      status: 'running',
      currentTool: this.currentTask.tool,
      elapsedMs: elapsed,
      toolChain: this.currentTask.toolChain,
      step: this.currentTask.step,
      lastActivityMs: lastActivity
    };
    
    const rendered = this.renderer.render(statusObj);
    this.terminal.update(rendered);
  }

  /**
   * 启动包装器
   */
  wrap(args = []) {
    console.log('🦐 Task Status Indicator 启动');
    console.log('按 Ctrl+C 退出\n');
    
    // 启动 OpenClaw 进程
    const openclaw = spawn('openclaw', args, {
      stdio: ['inherit', 'pipe', 'pipe']
    });
    
    // 处理标准输出
    const stdoutRl = readline.createInterface({
      input: openclaw.stdout,
      crlfDelay: Infinity
    });
    
    stdoutRl.on('line', (line) => {
      const event = this.parseLine(line);
      
      // 更新状态
      this.updateTask(event);
      
      // 显示原始输出（如果不是纯状态行）
      if (event.type === 'output' || event.raw) {
        // 如果正在运行，先清理状态条，输出内容，再恢复状态条
        if (this.isRunning) {
          this.terminal.clear();
          console.log(line);
          this.renderStatus();
        } else {
          console.log(line);
        }
      }
    });
    
    // 处理标准错误
    const stderrRl = readline.createInterface({
      input: openclaw.stderr,
      crlfDelay: Infinity
    });
    
    stderrRl.on('line', (line) => {
      // 错误输出直接显示，不干扰状态条
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
    
    // 处理 Ctrl+C
    process.on('SIGINT', () => {
      openclaw.kill('SIGINT');
    });
  }
}

// 主入口
const wrapper = new OpenClawWrapper();
const args = process.argv.slice(2);
wrapper.wrap(args);
