#!/bin/bash
# Task Status Indicator - 快速启动脚本

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

case "${1:-run}" in
  run)
    node "${SCRIPT_DIR}/task-monitor.js"
    ;;
  demo)
    node "${SCRIPT_DIR}/status-renderer.js"
    ;;
  test)
    node "${SCRIPT_DIR}/test.js"
    ;;
  install)
    echo "安装 Task Status Indicator..."
    chmod +x "${SCRIPT_DIR}/task-status.sh"
    echo "已添加执行权限"
    echo "使用: ./task-status.sh run"
    ;;
  *)
    echo "用法: ./task-status.sh [run|demo|test|install]"
    echo "  run    - 启动状态监控"
    echo "  demo   - 运行渲染演示"
    echo "  test   - 运行测试"
    echo "  install- 安装权限"
    ;;
esac
