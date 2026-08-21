#!/bin/bash
# 一键安装 dsh-opencode-go-usage 插件
set -e

cd ~/.dsh/profiles/web
pnpm add https://github.com/yk1288/dsh-opencode-go-usage.git

# 创建凭据文件（如果不存在）
if [ ! -f ~/.opencode-go-usage.json ]; then
  echo '{"workspace_id":"请填入","auth_cookie":"请填入"}' > ~/.opencode-go-usage.json
  chmod 600 ~/.opencode-go-usage.json
  echo "请编辑 ~/.opencode-go-usage.json 填入凭据"
  echo "获取方法: 登录 https://opencode.ai → F12 → Cookies 复制 auth，URL 中取 workspace ID"
fi

echo "安装完成，运行 dsh web 重启即可"
