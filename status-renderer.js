#!/usr/bin/env node
/**
 * Task Status Indicator - 核心渲染引擎
 * 生成 ANSI 状态条
 */

class StatusRenderer {
  constructor(config = {}) {
    this.config = {
      emoji: config.emoji || '🦐',
      agentName: config.agentName || '腾云虾',
      pulseThresholdMs: config.pulseThresholdMs || 3000,
      maxToolChainLength: config.maxToolChainLength || 3,
      showToolChain: config.showToolChain !== false,
      ...config
    };
    
    // 脉冲动画帧
    this.pulseFrames = ['▓', '░', '▓', '░', '▓'];
    this.pulseIndex = 0;
  }

  /**
   * 格式化时间
   */
  formatTime(ms) {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSecs = seconds % 60;
    return `${minutes}m${remainingSecs}s`;
  }

  /**
   * 处理工具链显示
   */
  formatToolChain(chain) {
    if (!this.config.showToolChain || !chain || chain.length <= 1) {
      return '';
    }
    
    if (chain.length > this.config.maxToolChainLength) {
      const visible = chain.slice(-2);
      return `... → ${visible.join(' → ')}`;
    }
    
    return chain.join(' → ');
  }

  /**
   * 渲染进度条
   * @param {number} step - 当前步骤
   * @param {boolean} pulseMode - 是否使用脉冲动画
   */
  renderProgressBar(step, pulseMode = false) {
    const barLength = 10;
    
    if (pulseMode) {
      // 脉冲动画模式
      const frame = this.pulseFrames[this.pulseIndex % this.pulseFrames.length];
      this.pulseIndex++;
      const empty = '░'.repeat(barLength - 1);
      const pos = Math.floor((this.pulseIndex / 2) % barLength);
      return '[' + empty.slice(0, pos) + frame + empty.slice(pos) + ']';
    }
    
    // 标准进度条（基于步骤数，但有上限）
    const progress = Math.min(step / 10, 1); // 假设最多10步，超过就满格
    const filled = Math.floor(progress * barLength);
    const empty = barLength - filled;
    
    return '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';
  }

  /**
   * 主渲染函数
   */
  render(statusObj) {
    const {
      status = 'running',
      currentTool = 'idle',
      elapsedMs = 0,
      toolChain = [],
      step = 0,
      lastActivityMs = 0,
      error = null
    } = statusObj;

    const elapsed = this.formatTime(elapsedMs);
    const lastActivity = this.formatTime(lastActivityMs);

    // 判断是否需要脉冲模式（单步骤超过阈值且仍在运行）
    const pulseMode = status === 'running' && lastActivityMs > this.config.pulseThresholdMs;

    // 根据状态渲染不同格式
    switch (status) {
      case 'running':
        return this.renderRunning(currentTool, elapsed, toolChain, step, lastActivity, pulseMode);
      case 'success':
        return this.renderSuccess(currentTool, elapsed, step);
      case 'error':
        return this.renderError(currentTool, elapsed, error);
      case 'pending':
        return this.renderPending();
      default:
        return this.renderIdle();
    }
  }

  renderRunning(tool, elapsed, toolChain, step, lastActivity, pulseMode) {
    const { emoji, agentName } = this.config;
    const chainStr = this.formatToolChain(toolChain);
    
    let line1 = `[${emoji} ${agentName}] 正在执行: ${tool} | 已耗时 ${elapsed}`;
    if (chainStr) {
      line1 += ` | 工具链: ${chainStr}`;
    }
    
    const bar = this.renderProgressBar(step, pulseMode);
    const stepStr = step > 0 ? `步骤 ${step}` : '准备中';
    const line2 = `${bar} ${stepStr} | 最后活动: ${lastActivity} 前`;
    
    return `${line1}\n${line2}`;
  }

  renderSuccess(tool, elapsed, step) {
    const { emoji, agentName } = this.config;
    return `✅ [${emoji} ${agentName}] ${tool} | 完成 | 耗时 ${elapsed}${step > 0 ? ` | 步骤 ${step}` : ''}`;
  }

  renderError(tool, elapsed, error) {
    const { emoji, agentName } = this.config;
    const errorType = error ? error.split(':')[0] : '未知错误';
    return `❌ [${emoji} ${agentName}] ${tool} | 失败 | 耗时 ${elapsed} | ${errorType}`;
  }

  renderPending() {
    const { emoji, agentName } = this.config;
    return `[${emoji} ${agentName}] 等待中...`;
  }

  renderIdle() {
    const { emoji, agentName } = this.config;
    return `[${emoji} ${agentName}] 就绪`;
  }
}

/**
 * ANSI 终端控制器
 */
class TerminalController {
  constructor() {
    this.lastLines = 0;
  }

  /**
   * 清行并输出新内容
   */
  update(content) {
    const lines = content.split('\n');
    const lineCount = lines.length;
    
    // 清掉之前的行
    if (this.lastLines > 0) {
      // 光标上移
      process.stdout.write('\x1b[' + this.lastLines + 'A');
      // 清到行尾
      for (let i = 0; i < this.lastLines; i++) {
        process.stdout.write('\x1b[2K\n');
      }
      // 光标再移回去
      process.stdout.write('\x1b[' + this.lastLines + 'A');
    }
    
    // 输出新内容
    process.stdout.write(content);
    
    // 如果新内容行数更少，需要额外清行
    if (lineCount < this.lastLines) {
      const diff = this.lastLines - lineCount;
      for (let i = 0; i < diff; i++) {
        process.stdout.write('\n\x1b[2K');
      }
      // 光标移回原位
      process.stdout.write('\x1b[' + diff + 'A');
    }
    
    this.lastLines = lineCount;
  }

  /**
   * 清理状态条（任务结束时调用）
   */
  clear() {
    if (this.lastLines > 0) {
      process.stdout.write('\x1b[' + this.lastLines + 'A');
      for (let i = 0; i < this.lastLines; i++) {
        process.stdout.write('\x1b[2K\n');
      }
      process.stdout.write('\x1b[' + this.lastLines + 'A');
      this.lastLines = 0;
    }
  }

  /**
   * 定格显示（任务完成/失败时不清理）
   */
  finalize(content) {
    // 先清掉之前的动态状态
    this.clear();
    // 输出最终状态并换行
    process.stdout.write(content + '\n');
    this.lastLines = 0;
  }
}

// 导出模块
module.exports = {
  StatusRenderer,
  TerminalController
};

// 如果直接运行，启动演示
if (require.main === module) {
  const renderer = new StatusRenderer();
  const terminal = new TerminalController();
  
  console.log('=== Task Status Indicator 演示 ===\n');
  
  let step = 0;
  let elapsed = 0;
  let lastActivity = 0;
  
  // 模拟运行
  const interval = setInterval(() => {
    elapsed += 500;
    lastActivity += 500;
    
    // 每3秒推进一个步骤
    if (elapsed % 3000 === 0) {
      step++;
      lastActivity = 0;
    }
    
    const status = renderer.render({
      status: 'running',
      currentTool: 'browser.snapshot',
      elapsedMs: elapsed,
      toolChain: ['browser', 'eval', 'write'].slice(0, Math.min(step + 1, 3)),
      step: step,
      lastActivityMs: lastActivity
    });
    
    terminal.update(status);
    
    // 15秒后结束演示
    if (elapsed >= 15000) {
      clearInterval(interval);
      const finalStatus = renderer.render({
        status: 'success',
        currentTool: 'browser.snapshot',
        elapsedMs: elapsed,
        step: step
      });
      terminal.finalize(finalStatus);
      console.log('\n演示结束！');
    }
  }, 500);
}
