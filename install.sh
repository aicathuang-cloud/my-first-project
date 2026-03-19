#!/bin/bash
# Task Status Indicator - 快速安装脚本

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_NAME="task-status-indicator"
echo "🦐 安装 Task Status Indicator..."

# 1. 添加执行权限
echo "添加执行权限..."
chmod +x "${SCRIPT_DIR}/openclaw-status-wrap.js"
chmod +x "${SCRIPT_DIR}/status-renderer.js"
chmod +x "${SCRIPT_DIR}/task-monitor.js"
chmod +x "${SCRIPT_DIR}/task-status.sh"
chmod +x "${SCRIPT_DIR}/test.js"

# 2. 检测 shell
detect_shell() {
    if [ -n "$ZSH_VERSION" ] || [ -f "$HOME/.zshrc" ]; then
        echo "zsh"
    elif [ -n "$BASH_VERSION" ] || [ -f "$HOME/.bashrc" ]; then
        echo "bash"
    else
        echo "unknown"
    fi
}

SHELL_TYPE=$(detect_shell)

# 3. 添加别名
echo ""
echo "是否添加 'ocs' 别名到 shell 配置？"
echo "这样可以直接用 'ocs' 启动带状态条的 OpenClaw"
read -p "添加别名? (y/n) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    ALIAS_CMD="alias ocs='node ${SCRIPT_DIR}/openclaw-status-wrap.js'"
    
    case $SHELL_TYPE in
        zsh)
            echo "$ALIAS_CMD" >> "$HOME/.zshrc"
            echo "✅ 已添加到 ~/.zshrc"
            echo "运行 'source ~/.zshrc' 生效"
            ;;
        bash)
            echo "$ALIAS_CMD" >> "$HOME/.bashrc"
            echo "✅ 已添加到 ~/.bashrc"
            echo "运行 'source ~/.bashrc' 生效"
            ;;
        *)
            echo "⚠️ 无法检测 shell 类型，请手动添加："
            echo "$ALIAS_CMD"
            ;;
    esac
fi

# 4. 完成
echo ""
echo "=== 安装完成 ==="
echo ""
echo "使用方法："
echo "  1. 立即使用:"
echo "     node ${SCRIPT_DIR}/openclaw-status-wrap.js"
echo ""
echo "  2. 使用别名（如果添加了）:"
echo "     ocs"
echo ""
echo "  3. 运行测试:"
echo "     node ${SCRIPT_DIR}/test.js"
echo ""
echo "  4. 运行演示:"
echo "     node ${SCRIPT_DIR}/status-renderer.js"
echo ""
