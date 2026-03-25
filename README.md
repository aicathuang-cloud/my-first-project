# Open Claw 进度条

一个简单、可定制的命令行进度条，用于显示任务执行进度。

## 特性

- 可定制的进度条宽度
- 可自定义填充和空槽字符
- 支持前缀和后缀文本
- 实时更新进度
- 简单易用的API

## 安装

将 `progress-bar.js` 文件复制到您的项目中，然后通过 require 引入：

```javascript
const OpenClawProgressBar = require('./progress-bar');
```

## 使用方法

### 基本用法

```javascript
const bar = new OpenClawProgressBar({
  total: 100,  // 总进度值
  prefix: '任务进度: ',  // 前缀文本
  suffix: '完成'  // 后缀文本
});

// 更新进度
bar.update(50);  // 更新到50%

// 增加进度
bar.increment();  // 增加1%

// 完成任务
bar.done();  // 更新到100%并换行
```

### 自定义选项

```javascript
const bar = new OpenClawProgressBar({
  total: 50,          // 总进度值
  width: 30,          // 进度条宽度
  fill: '■',          // 填充字符
  empty: '□',         // 空槽字符
  prefix: '处理中: ',  // 前缀文本
  suffix: '剩余 50 项' // 后缀文本
});
```

## 示例

运行 `example.js` 查看使用示例：

```bash
node example.js
```

## API

### 构造函数

```javascript
new OpenClawProgressBar(options)
```

**选项**：
- `total`：总进度值，默认为100
- `width`：进度条宽度，默认为50
- `fill`：填充字符，默认为'█'
- `empty`：空槽字符，默认为' '
- `prefix`：前缀文本，默认为'Progress: '
- `suffix`：后缀文本，默认为''

### 方法

- `update(progress)`：更新进度到指定值
- `increment(amount)`：增加指定数量的进度，默认为1
- `render()`：渲染进度条（内部使用）
- `done()`：完成任务，更新到100%并换行

## 示例输出

```
示例1：基本用法
任务进度: [██████████████████████████████████████████████████] 100% 完成
任务1完成

示例2：自定义样式
处理中: [■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■] 100% 剩余 0 项
任务2完成

示例3：使用increment方法
下载进度: [██████████████████████████████████████████████████] 100% 20MB
任务3完成
```