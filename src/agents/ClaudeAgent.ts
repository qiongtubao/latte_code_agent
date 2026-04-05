import Anthropic from '@anthropic-ai/sdk';
import { BaseAgent, AgentContext, AgentResult } from './BaseAgent';
import { AgentConfig } from '../types';

export class ClaudeAgent extends BaseAgent {
  private client: Anthropic;

  constructor(config: AgentConfig) {
    super(config);
    this.client = new Anthropic();
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const prompt = this.buildPrompt(context);
      
      const message = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const responseText = message.content[0].type === 'text' 
        ? message.content[0].text 
        : '';

      return {
        success: true,
        message: 'Claude agent executed successfully',
        data: responseText,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Claude agent execution failed',
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  private buildPrompt(context: AgentContext): string {
    if (this.config.type === 'initializer') {
      return this.buildInitializerPrompt(context);
    }
    return this.buildCodingPrompt(context);
  }

  private buildInitializerPrompt(context: AgentContext): string {
    return `你是一个项目初始化 Agent。你的任务是：

1. 阅读 LATTE.md 文件，理解项目需求
2. 创建详细的功能列表 (feature_list.json)
3. 设置项目结构
4. 创建初始化脚本 (init.sh)
5. 初始化 Git 仓库

项目根目录: ${context.projectRoot}

要求：
- 功能列表必须详细、可测试
- 每个功能必须有明确的验收标准
- 初始化脚本必须可重复执行
- Git 提交信息必须清晰

输出：
- .latte/feature_list.json
- .latte/progress.md
- init.sh
- 初始 Git 提交`;
  }

  private buildCodingPrompt(context: AgentContext): string {
    const feature = context.feature;
    const progress = context.progress;

    return `你是一个编码 Agent。你的任务是：

1. 读取进度文件和 Git 日志，了解当前状态
2. 实现指定的功能
3. 编写测试
4. 验证功能正常工作
5. 更新进度文件
6. 提交 Git 更改

项目根目录: ${context.projectRoot}

当前任务:
- ID: ${feature?.id || 'N/A'}
- 描述: ${feature?.description || 'N/A'}
- 优先级: ${feature?.priority || 'N/A'}

已完成的工作:
${progress?.completed_work.map(w => `- ${w}`).join('\n') || '无'}

要求：
- 必须编写测试
- 必须验证功能端到端可用
- 代码必须可编译
- Git 提交前必须确保代码处于可工作状态

禁止：
- 同时处理多个功能
- 跳过测试
- 在代码不可工作时提交
- 删除或修改现有测试`;
  }
}
