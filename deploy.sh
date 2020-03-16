#!/usr/bin/env sh

# 确保脚本抛出遇到的错误
set -e

# 生成静态文件
npm run build

# 删除原有文件
rm -rf /data/wwwroot/default/*

# 移入新构建的文件
mv docs/.vuepress/dist/* /data/wwwroot/default