# Latte Code Agent

## 项目介绍

Latte Code Agent 是一个基于 Latte 模型的代码生成智能体，用于自动生成代码。本项目采用自举（bootstrap）方式开发，即使用 latte-code-agent 来升级自己。

参考文档：https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents

## 技术栈

- 语言：TypeScript
- 运行时：Node.js >= 18.0.0
- CLI 框架：Commander.js
- 测试框架：Jest
- 代码风格：ESLint + Prettier
- 模型集成：Claude API, Trae

## 功能需求

### 1. CLI 命令系统

#### 1.1 latte-code-agent init
- 读取项目 LATTE.md 文件，理解项目需求
- 创建 .latte/ 目录结构
- 生成 feature_list.json（功能列表）
- 生成 progress.md（进度日志）
- 生成 state.json（状态文件）
- 初始化 Git 仓库
- 创建 init.sh 初始化脚本
- 支持并行任务配置
- 可选：生成流程图文档（Mermaid）
- 可选：生成设计图（绑定任务）

#### 1.2 latte-code-agent run
- 从任务列表中选择一个待处理任务
- 支持指定特定任务 ID
- 调用 Latte 模型（可调用 claude-code 或 trae）
- 生成代码并验证
- 运行测试
- Git 提交
- 更新进度文件

#### 1.3 latte-code-agent loop
- 重复执行 run 命令
- 直到任务列表为空或达到最大迭代次数
- 支持失败重试
- 支持延迟执行

#### 1.4 latte-code-agent test
- 运行测试框架
- 验证代码是否符合需求
- 生成测试报告
- 支持单元测试、集成测试、E2E 测试

#### 1.5 latte-code-agent status
- 显示项目状态
- 显示功能完成情况
- 显示统计信息

### 2. Agent 系统

#### 2.1 初始化 Agent (Initializer Agent)
- 解析 LATTE.md 文件
- 创建项目结构
- 生成功能列表
- 设置初始环境

#### 2.2 编码 Agent (Coding Agent)
- 实现单个功能
- 编写测试代码
- 验证功能正确性
- 更新项目文档

### 3. 状态管理

#### 3.1 功能列表 (feature_list.json)
- 项目名称
- 创建时间
- 功能列表（ID、描述、优先级、状态、测试用例）
- 并行任务组
- 依赖关系

#### 3.2 进度日志 (progress.md)
- 会话 ID
- 当前任务
- 已完成工作
- 遇到的问题
- 下一步计划
- Git 提交记录

#### 3.3 状态文件 (state.json)
- 版本号
- 最后运行时间
- 总会话数
- 统计信息

### 4. 模型集成

#### 4.1 Claude API 集成
- 使用 @anthropic-ai/sdk
- 支持自定义提示词
- 支持上下文管理

#### 4.2 Trae 集成
- 命令行调用
- 支持自定义参数

#### 4.3 Latte 模型集成
- 预留接口
- 待实现

### 5. 测试系统

#### 5.1 单元测试
- 函数级别测试
- 模块级别测试
- 覆盖率检查

#### 5.2 集成测试
- API 测试
- 服务间通信测试

#### 5.3 E2E 测试
- 用户流程测试
- CLI 命令测试

### 6. Git 集成

#### 6.1 自动提交
- 功能完成后自动提交
- 清晰的提交信息
- 原子性提交

#### 6.2 分支管理
- 支持创建功能分支
- 支持合并请求

### 7. 错误处理

#### 7.1 编译错误
- 自动修复
- 重试机制

#### 7.2 测试失败
- 分析失败原因
- 尝试修复

#### 7.3 依赖问题
- 自动安装依赖
- 版本冲突处理

## 非功能需求

### 性能要求
- 单个任务执行时间 < 5 分钟
- 支持大项目（100+ 功能）
- 内存占用 < 500MB

### 安全要求
- API 密钥安全存储
- 不泄露敏感信息
- 代码安全检查

### 可扩展性
- 支持插件系统
- 支持自定义 Agent
- 支持自定义测试框架

### 可维护性
- 清晰的代码结构
- 完善的文档
- 单元测试覆盖率 > 80%

## 验收标准

- [ ] 所有 CLI 命令正常工作
- [ ] 能够成功初始化项目
- [ ] 能够执行单个任务
- [ ] 能够循环执行所有任务
- [ ] 测试覆盖率 > 80%
- [ ] 所有测试通过
- [ ] 代码编译无错误
- [ ] ESLint 检查通过
- [ ] 能够自举升级自己

## 开发计划

### Phase 1: 基础框架 ✅
- [x] 创建 CLI 框架
- [x] 实现配置管理
- [x] 实现文件操作工具
- [x] 实现 Git 操作封装

### Phase 2: 初始化功能 ✅
- [x] 实现 LATTE.md 解析器
- [x] 实现功能列表生成器
- [x] 实现项目结构创建
- [x] 实现 Git 初始化

### Phase 3: 任务执行 ✅
- [x] 集成 Claude API
- [x] 实现任务选择逻辑
- [x] 实现代码生成流程
- [x] 实现进度跟踪

### Phase 4: 测试集成 ✅
- [x] 集成 Jest 测试框架
- [x] 实现测试运行器
- [x] 实现测试报告生成
- [x] 实现质量检查

### Phase 5: 优化和完善
- [ ] 完善 Trae 集成
- [ ] 实现 Latte 模型集成
- [ ] 添加更多测试用例
- [ ] 性能优化
- [ ] 文档完善

### Phase 6: 自举升级
- [ ] 使用 latte-code-agent 升级自己
- [ ] 添加新功能
- [ ] 修复已知问题
- [ ] 提升代码质量

## 使用示例

### 初始化项目
```bash
latte-code-agent init
```

### 执行单个任务
```bash
latte-code-agent run
latte-code-agent run -f F001
latte-code-agent run -m trae
```

### 循环执行
```bash
latte-code-agent loop
latte-code-agent loop --max-iterations 20
```

### 运行测试
```bash
latte-code-agent test
latte-code-agent test -f F001
```

### 查看状态
```bash
latte-code-agent status
```

## 单个代码必要条件

1. **代码编译**
   - TypeScript 编译无错误
   - 类型检查通过

2. **代码测试**
   - 单元测试通过
   - 集成测试通过
   - 覆盖率达标

3. **Git 提交**
   - 清晰的提交信息
   - 原子性提交
   - 无无关更改

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT License
