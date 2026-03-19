#!/usr/bin/env node
/**
 * Task Status Indicator - 测试文件
 */

const { StatusRenderer, TerminalController } = require('./status-renderer');

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (err) {
    console.error(`✗ ${name}: ${err.message}`);
  }
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg}: expected "${expected}", got "${actual}"`);
  }
}

console.log('=== 运行测试 ===\n');

const renderer = new StatusRenderer({
  emoji: '🦐',
  agentName: '腾云虾'
});

// 测试时间格式化
test('formatTime - 毫秒', () => {
  assertEqual(renderer.formatTime(500), '500ms', '500ms 格式化');
});

test('formatTime - 秒', () => {
  assertEqual(renderer.formatTime(12000), '12s', '12s 格式化');
});

test('formatTime - 分钟', () => {
  assertEqual(renderer.formatTime(125000), '2m5s', '2m5s 格式化');
});

// 测试工具链格式化
test('formatToolChain - 空', () => {
  assertEqual(renderer.formatToolChain([]), '', '空链');
  assertEqual(renderer.formatToolChain(['browser']), '', '单工具');
});

test('formatToolChain - 正常', () => {
  assertEqual(renderer.formatToolChain(['browser', 'eval']), 'browser → eval', '双工具');
});

test('formatToolChain - 截断', () => {
  const long = ['a', 'b', 'c', 'd', 'e'];
  assertEqual(renderer.formatToolChain(long), '... → d → e', '超长链截断');
});

// 测试状态渲染
test('render - pending', () => {
  const result = renderer.render({ status: 'pending' });
  if (!result.includes('等待中')) throw new Error('pending 状态渲染失败');
});

test('render - idle', () => {
  const result = renderer.render({ status: 'idle' });
  if (!result.includes('就绪')) throw new Error('idle 状态渲染失败');
});

test('render - running', () => {
  const result = renderer.render({
    status: 'running',
    currentTool: 'test',
    elapsedMs: 5000,
    step: 2
  });
  if (!result.includes('正在执行')) throw new Error('running 状态渲染失败');
  if (!result.includes('test')) throw new Error('工具名未显示');
});

test('render - success', () => {
  const result = renderer.render({
    status: 'success',
    currentTool: 'test',
    elapsedMs: 10000,
    step: 5
  });
  if (!result.includes('✅')) throw new Error('success 图标失败');
  if (!result.includes('完成')) throw new Error('success 文本失败');
});

test('render - error', () => {
  const result = renderer.render({
    status: 'error',
    currentTool: 'test',
    elapsedMs: 5000,
    error: 'Timeout: connection failed'
  });
  if (!result.includes('❌')) throw new Error('error 图标失败');
  if (!result.includes('Timeout')) throw new Error('error 类型失败');
});

console.log('\n=== 测试完成 ===');
