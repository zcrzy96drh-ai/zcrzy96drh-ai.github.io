#!/bin/bash
# 快速新建文章或项目
# 用法: ./new.sh post 标题       ./new.sh project 项目名

set -e

TYPE=$1
TITLE=$2

if [ -z "$TYPE" ] || [ -z "$TITLE" ]; then
  echo "用法: ./new.sh <post|project> <名称>"
  echo "示例: ./new.sh post my-first-post"
  echo "      ./new.sh project my-new-app"
  exit 1
fi

# 转小写 + 连字符
SLUG=$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd 'a-z0-9-')

echo "📝 创建 $TYPE: $SLUG"

# 创建中文版
hugo new content "zh/${TYPE}s/${SLUG}.md"

# 创建英文版
hugo new content "en/${TYPE}s/${SLUG}.md"

echo ""
echo "✅ 已创建："
echo "  content/zh/${TYPE}s/${SLUG}.md"
echo "  content/en/${TYPE}s/${SLUG}.md"
echo ""
echo "下一步："
echo "  1. 编辑内容"
echo "  2. hugo server -D  预览"
echo "  3. 改 draft: false"
echo "  4. git push        发布 🚀"
