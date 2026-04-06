#!/bin/bash
# Latte Code Agent Initialization Script
# This script sets up the development environment

echo "Initializing Node.js project..."

# 检查 npm 是否安装
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed"
    exit 1
fi

# 安装依赖
npm install

echo "Project initialized successfully!"
