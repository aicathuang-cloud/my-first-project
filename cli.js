#!/usr/bin/env node
const configManager = require('./config-manager');

function showHelp() {
  console.log('OpenClaw 进度条命令行工具');
  console.log('');
  console.log('命令:');
  console.log('  status       查看当前自动执行状态');
  console.log('  enable       启用自动执行');
  console.log('  disable      禁用自动执行');
  console.log('  help         显示帮助信息');
  console.log('');
  console.log('示例:');
  console.log('  node cli.js status');
  console.log('  node cli.js disable');
  console.log('');
}

function showStatus() {
  const status = configManager.isAutoExecuteEnabled();
  console.log(`当前自动执行状态: ${status ? '已启用' : '已禁用'}`);
  console.log(`配置文件路径: ${configManager.configPath}`);
}

function enableAutoExecute() {
  const result = configManager.enableAutoExecute();
  if (result) {
    console.log('自动执行功能已启用');
  } else {
    console.error('启用自动执行功能失败');
  }
}

function disableAutoExecute() {
  const result = configManager.disableAutoExecute();
  if (result) {
    console.log('自动执行功能已禁用');
  } else {
    console.error('禁用自动执行功能失败');
  }
}

// 解析命令行参数
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'status':
    showStatus();
    break;
  case 'enable':
    enableAutoExecute();
    break;
  case 'disable':
    disableAutoExecute();
    break;
  case 'help':
  case '--help':
  case '-h':
    showHelp();
    break;
  default:
    console.log('未知命令');
    showHelp();
    break;
}
