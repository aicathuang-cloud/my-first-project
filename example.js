const OpenClawProgressBar = require('./progress-bar');

// 示例2：自定义样式
console.log('示例2：自定义样式');
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