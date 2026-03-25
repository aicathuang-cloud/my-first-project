const OpenClawProgressBar = require('./progress-bar');
const configManager = require('./config-manager');

function simulateTask() {
  console.log('开始执行任务...');
  
  const bar = new OpenClawProgressBar({
    total: 50,
    width: 30,
    fill: '■',
    empty: '□',
    prefix: '处理中: ',
    suffix: '剩余 ' + 50 + ' 项'
  });

  let progress = 0;
  const interval = setInterval(() => {
    progress += 1;
    bar.suffix = '剩余 ' + (50 - progress) + ' 项';
    bar.update(progress);
    if (progress >= 50) {
      clearInterval(interval);
      bar.done();
      console.log('任务完成');
    }
  }, 100);
}

// 检查自动执行状态
const isAutoExecuteEnabled = configManager.isAutoExecuteEnabled();
console.log(`自动执行状态: ${isAutoExecuteEnabled ? '已启用' : '已禁用'}`);

if (isAutoExecuteEnabled) {
  console.log('自动执行已启用，开始执行任务...');
  simulateTask();
} else {
  console.log('自动执行已禁用，任务将不会自动执行');
  console.log('使用以下命令启用自动执行:');
  console.log('  node cli.js enable');
}
