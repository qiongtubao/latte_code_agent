# Latte Code Agent 详细设计文档

## 一、项目概述

Latte Code Agent 是一个基于 Latte 模型的代码生成智能体，用于自动生成代码。本设计参考 Anthropic 的 long-running agents 最佳实践，解决多上下文窗口之间的状态传递问题。

## 二、核心问题分析

### 2.1 长时间运行 Agent 的挑战

根据 Anthropic 的研究，长时间运行的 Agent 面临以下核心问题：

1. **上下文窗口限制**：复杂项目无法在单个上下文窗口内完成
2. **会话记忆缺失**：每个新会话开始时没有之前的记忆
3. **过度尝试**：Agent 倾向于一次性完成所有工作，导致上下文耗尽
4. **过早完成**：Agent 在部分功能完成后就认为项目已完成
5. **测试不足**：Agent 容易在没有充分测试的情况下标记功能完成

### 2.2 解决方案架构

采用双 Agent 架构：
- **初始化 Agent (Initializer Agent)**：首次运行时设置环境
- **编码 Agent (Coding Agent)**：后续每次会话进行增量开发

## 三、系统架构设计

### 3.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Latte Code Agent CLI                      │
├─────────────────────────────────────────────────────────────┤
│  init  │  run  │  loop  │  test                             │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Agent Harness                             │
├─────────────────────────────────────────────────────────────┤
│  Initializer Agent  │  Coding Agent                         │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    State Management                          │
├─────────────────────────────────────────────────────────────┤
│  feature_list.json │ progress.md │ git commits │ init.sh   │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 核心组件

#### 3.2.1 状态文件

| 文件名 | 用途 | 格式 |
|--------|------|------|
| feature_list.json | 功能列表和状态 | JSON |
| progress.md | 进度日志 | Markdown |
| init.sh | 环境初始化脚本 | Shell |
| .agent_state.json | Agent 内部状态 | JSON |

#### 3.2.2 功能列表结构

```json
{
  "project_name": "项目名称",
  "created_at": "2026-04-06T00:00:00Z",
  "features": [
    {
      "id": "F001",
      "category": "functional",
      "description": "功能描述",
      "priority": "high",
      "steps": [
        "步骤1",
        "步骤2",
        "步骤3"
      ],
      "status": "pending",
      "assigned_to": null,
      "completed_at": null,
      "test_cases": []
    }
  ]
}
```

## 四、命令详细设计

### 4.1 latte-code-agent init

#### 4.1.1 功能说明

初始化项目环境，创建必要的文件结构和配置。

#### 4.1.2 执行流程

```
1. 读取 LATTE.md 文件
   ├─ 解析项目需求
   ├─ 提取功能点
   └─ 识别技术栈

2. 创建项目结构
   ├─ .latte/ 目录
   │   ├─ feature_list.json
   │   ├─ progress.md
   │   ├─ state.json
   │   └─ config.json
   └─ docs/ 目录
       └─ architecture.md

3. 生成功能列表
   ├─ 将需求拆解为具体功能
   ├─ 设置优先级
   ├─ 定义验收标准
   └─ 标记所有功能为 pending

4. 创建初始化脚本
   ├─ init.sh (环境初始化)
   └─ test.sh (测试脚本)

5. 初始化 Git 仓库
   ├─ git init
   ├─ 创建 .gitignore
   └─ 初始提交

6. 生成流程图文档
   └─ 可选：使用 Mermaid 生成架构图

7. 输出初始化报告
```

#### 4.1.3 LATTE.md 文件格式规范

```markdown
# 项目名称

## 项目描述
[项目的整体描述]

## 技术栈
- 语言：Python/JavaScript/Go
- 框架：[框架名称]
- 数据库：[数据库类型]
- 测试框架：[测试框架]

## 功能需求
1. [功能1]
   - 子功能 1.1
   - 子功能 1.2
2. [功能2]
   - 子功能 2.1

## 非功能需求
- 性能要求
- 安全要求
- 可扩展性要求

## 验收标准
- [ ] 所有测试通过
- [ ] 代码覆盖率 > 80%
- [ ] 无严重 bug
```

#### 4.1.4 并行任务支持

```json
{
  "parallel_groups": [
    {
      "group_id": "G001",
      "features": ["F001", "F002", "F003"],
      "description": "可并行执行的功能组",
      "dependencies": []
    }
  ],
  "dependencies": [
    {
      "from": "F001",
      "to": "F004",
      "type": "requires"
    }
  ]
}
```

### 4.2 latte-code-agent run

#### 4.2.1 功能说明

执行单个任务，调用 Latte 模型生成代码。

#### 4.2.2 执行流程

```
1. 环境检查
   ├─ 检查 .latte/ 目录是否存在
   ├─ 验证 feature_list.json
   └─ 检查 Git 状态

2. 状态恢复
   ├─ 读取 progress.md
   ├─ 读取 Git 日志
   └─ 运行 init.sh 验证环境

3. 选择任务
   ├─ 从 feature_list.json 获取待处理任务
   ├─ 按优先级排序
   ├─ 检查依赖关系
   └─ 选择最高优先级的可执行任务

4. 执行任务
   ├─ 调用 Latte 模型
   │   ├─ Claude Code (可选)
   │   └─ Trae (可选)
   ├─ 生成代码
   ├─ 编译检查
   └─ 单元测试

5. 验证结果
   ├─ 运行测试套件
   ├─ 检查代码质量
   └─ 端到端测试

6. 更新状态
   ├─ 更新 feature_list.json
   ├─ 写入 progress.md
   ├─ Git 提交
   └─ 更新 state.json

7. 清理环境
   └─ 确保代码处于可工作状态
```

#### 4.2.3 任务选择策略

```python
def select_next_task(feature_list):
    pending_tasks = filter(lambda f: f['status'] == 'pending', feature_list['features'])
    
    for task in sort_by_priority(pending_tasks):
        if all_dependencies_met(task, feature_list):
            if can_run_in_parallel(task):
                return task
            elif no_parallel_task_running():
                return task
    
    return None
```

#### 4.2.4 进度文件格式

```markdown
# Latte Code Agent 进度日志

## 会话: 2026-04-06 10:00:00

### 当前任务
- 任务ID: F001
- 描述: 实现用户登录功能
- 状态: 进行中

### 完成的工作
1. 创建用户模型
2. 实现登录 API
3. 添加密码加密

### 遇到的问题
- 问题1: [描述]
  - 解决方案: [描述]

### 下一步计划
- 完成登录功能测试
- 开始 F002 任务

### Git 提交
- abc123: feat: 实现用户登录功能
```

### 4.3 latte-code-agent loop

#### 4.3.1 功能说明

循环执行任务，直到所有任务完成。

#### 4.3.2 执行流程

```
while has_pending_tasks():
    result = run_single_task()
    
    if result.success:
        log_progress(result)
        commit_changes()
    else:
        handle_failure(result)
        if should_retry(result):
            retry_task(result.task)
        else:
            mark_as_blocked(result.task)
    
    if max_iterations_reached():
        break
    
    if all_tasks_blocked():
        request_human_intervention()
        break
```

#### 4.3.3 失败处理策略

| 错误类型 | 处理方式 |
|---------|---------|
| 编译错误 | 自动修复，最多重试 3 次 |
| 测试失败 | 分析失败原因，尝试修复 |
| 依赖缺失 | 安装依赖，重新执行 |
| 环境错误 | 重新初始化环境 |
| 超时 | 标记为阻塞，请求人工干预 |

### 4.4 latte-code-agent test

#### 4.4.1 功能说明

运行测试框架，验证代码质量。

#### 4.4.2 测试层次

```
1. 单元测试
   ├─ 函数级别测试
   ├─ 模块级别测试
   └─ 覆盖率检查

2. 集成测试
   ├─ API 测试
   ├─ 数据库测试
   └─ 服务间通信测试

3. 端到端测试
   ├─ 用户流程测试
   ├─ UI 自动化测试
   └─ 性能测试

4. 质量检查
   ├─ 代码风格检查
   ├─ 安全扫描
   └─ 依赖漏洞检查
```

#### 4.4.3 测试报告格式

```json
{
  "timestamp": "2026-04-06T10:00:00Z",
  "feature_id": "F001",
  "tests": {
    "unit": {
      "total": 10,
      "passed": 9,
      "failed": 1,
      "coverage": "85%"
    },
    "integration": {
      "total": 5,
      "passed": 5,
      "failed": 0
    },
    "e2e": {
      "total": 3,
      "passed": 2,
      "failed": 1
    }
  },
  "issues": [
    {
      "type": "test_failure",
      "message": "登录失败场景未处理",
      "severity": "high"
    }
  ]
}
```

## 五、代码质量保证

### 5.1 单个代码必要条件

每个生成的代码必须满足：

1. **代码编译**
   - 无语法错误
   - 无类型错误（如适用）
   - 依赖正确安装

2. **代码测试**
   - 单元测试通过
   - 集成测试通过
   - 覆盖率达标

3. **Git 提交**
   - 清晰的提交信息
   - 原子性提交
   - 无无关更改

### 5.2 代码审查检查项

- [ ] 代码符合项目规范
- [ ] 无安全漏洞
- [ ] 无性能问题
- [ ] 文档完整
- [ ] 测试充分

## 六、Agent 提示词设计

### 6.1 初始化 Agent 提示词

```
你是一个项目初始化 Agent。你的任务是：

1. 阅读 LATTE.md 文件，理解项目需求
2. 创建详细的功能列表 (feature_list.json)
3. 设置项目结构
4. 创建初始化脚本 (init.sh)
5. 初始化 Git 仓库

要求：
- 功能列表必须详细、可测试
- 每个功能必须有明确的验收标准
- 初始化脚本必须可重复执行
- Git 提交信息必须清晰

输出：
- .latte/feature_list.json
- .latte/progress.md
- init.sh
- 初始 Git 提交
```

### 6.2 编码 Agent 提示词

```
你是一个编码 Agent。你的任务是：

1. 读取进度文件和 Git 日志，了解当前状态
2. 从功能列表中选择一个待处理任务
3. 实现该功能
4. 编写测试
5. 验证功能正常工作
6. 更新进度文件
7. 提交 Git 更改

要求：
- 每次只处理一个功能
- 必须编写测试
- 必须验证功能端到端可用
- 代码必须可编译
- Git 提交前必须确保代码处于可工作状态

禁止：
- 同时处理多个功能
- 跳过测试
- 在代码不可工作时提交
- 删除或修改现有测试
```

## 七、实现步骤

### Phase 1: 基础框架 (Week 1)

- [ ] 创建 CLI 框架
- [ ] 实现配置管理
- [ ] 实现文件操作工具
- [ ] 实现 Git 操作封装

### Phase 2: 初始化功能 (Week 2)

- [ ] 实现 LATTE.md 解析器
- [ ] 实现功能列表生成器
- [ ] 实现项目结构创建
- [ ] 实现 Git 初始化

### Phase 3: 任务执行 (Week 3-4)

- [ ] 集成 Latte 模型 API
- [ ] 实现任务选择逻辑
- [ ] 实现代码生成流程
- [ ] 实现进度跟踪

### Phase 4: 测试集成 (Week 5)

- [ ] 集成测试框架
- [ ] 实现测试运行器
- [ ] 实现测试报告生成
- [ ] 实现质量检查

### Phase 5: 循环执行 (Week 6)

- [ ] 实现循环执行逻辑
- [ ] 实现失败处理
- [ ] 实现并行任务支持
- [ ] 实现人工干预接口

## 八、技术选型

### 8.1 核心技术

| 组件 | 技术选择 | 理由 |
|------|---------|------|
| CLI 框架 | Click/Typer | Python 生态成熟 |
| 配置管理 | Pydantic | 类型安全，验证方便 |
| Git 操作 | GitPython | Python 原生支持 |
| 测试框架 | pytest | 生态丰富，插件多 |
| 日志 | Loguru | 简单易用 |

### 8.2 模型集成

支持多种后端：
- Latte 模型 (主要)
- Claude Code (可选)
- Trae (可选)

## 九、风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 模型生成错误代码 | 高 | 自动测试，人工审核 |
| 上下文丢失 | 中 | 详细进度文件，Git 历史 |
| 依赖冲突 | 中 | 虚拟环境，容器化 |
| 任务阻塞 | 中 | 超时机制，人工干预 |

## 十、成功指标

- 功能完成率 > 95%
- 测试覆盖率 > 80%
- 代码编译成功率 = 100%
- 单次任务成功率 > 90%
- 人工干预率 < 10%

## 十一、参考资料

- [Anthropic: Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- Claude Agent SDK 文档
- 最佳实践：增量开发、持续集成
