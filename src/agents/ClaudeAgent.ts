import Anthropic from '@anthropic-ai/sdk';
import * as path from 'path';
import * as fs from 'fs-extra';
import { BaseAgent, AgentContext, AgentResult } from './BaseAgent';
import { AgentConfig } from '../types';

interface ClaudeSettings {
  env?: {
    ANTHROPIC_AUTH_TOKEN?: string;
    ANTHROPIC_API_KEY?: string;
    ANTHROPIC_BASE_URL?: string;
    ANTHROPIC_DEFAULT_SONNET_MODEL?: string;
    ANTHROPIC_DEFAULT_OPUS_MODEL?: string;
    ANTHROPIC_DEFAULT_HAIKU_MODEL?: string;
  };
  model?: string;
}

function loadClaudeSettings(): ClaudeSettings {
  const settingsPath = path.join(process.env.HOME || '~', '.claude', 'settings.json');
  try {
    if (fs.pathExistsSync(settingsPath)) {
      return fs.readJsonSync(settingsPath);
    }
  } catch {}
  return {};
}

export class ClaudeAgent extends BaseAgent {
  private client: Anthropic;
  private model: string;

  constructor(config: AgentConfig) {
    super(config);

    const settings = loadClaudeSettings();
    const apiKey = process.env.ANTHROPIC_API_KEY
      || process.env.ANTHROPIC_AUTH_TOKEN
      || settings.env?.ANTHROPIC_API_KEY
      || settings.env?.ANTHROPIC_AUTH_TOKEN;

    if (!apiKey) {
      throw new Error(
        'API key not found. Configure it in ~/.claude/settings.json:\n' +
        '  { "env": { "ANTHROPIC_AUTH_TOKEN": "your-key" } }'
      );
    }

    const baseURL = process.env.ANTHROPIC_BASE_URL || settings.env?.ANTHROPIC_BASE_URL;

    this.client = new Anthropic({
      apiKey,
      ...(baseURL ? { baseURL } : {}),
    });

    this.model = config.modelName
      || settings.env?.ANTHROPIC_DEFAULT_SONNET_MODEL
      || settings.model
      || 'claude-3-5-sonnet-20241022';
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const prompt = this.buildPrompt(context);

      this.log(`Calling model: ${this.model}`);

      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      // Extract text from response, handling different content types
      let responseText = '';
      for (const block of message.content) {
        if (block.type === 'text') {
          responseText += block.text;
        }
      }

      this.log(`Response: stop_reason=${message.stop_reason}, length=${responseText.length}`);

      if (!responseText) {
        return {
          success: false,
          message: `Model returned empty response (stop_reason: ${message.stop_reason}). Try a different model or increase max_tokens.`,
        };
      }

      if (this.config.type === 'coding') {
        return this.handleCodingResponse(responseText, context);
      }

      return {
        success: true,
        message: 'Claude agent executed successfully',
        data: responseText,
      };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Claude agent execution failed: ${errMsg}`,
        error: error instanceof Error ? error : new Error(errMsg),
      };
    }
  }

  private handleCodingResponse(responseText: string, context: AgentContext): AgentResult {
    // Save raw response for debugging
    const debugPath = path.join(context.projectRoot, '.latte', 'last_response.md');
    try {
      fs.ensureDirSync(path.dirname(debugPath));
      fs.writeFileSync(debugPath, responseText, 'utf-8');
    } catch {}

    const filesChanged = this.extractAndWriteFiles(responseText, context.projectRoot);

    if (filesChanged.length === 0) {
      return {
        success: false,
        message: 'No code blocks with file paths found in model response. Raw response saved to .latte/last_response.md',
      };
    }

    return {
      success: true,
      message: `Generated ${filesChanged.length} file(s)`,
      data: responseText,
      files_changed: filesChanged,
    };
  }

  private extractAndWriteFiles(responseText: string, projectRoot: string): string[] {
    const filesChanged: string[] = [];
    const written = new Set<string>();

    // Strategy 1: ```lang\n// filepath\n...\n``` (comment-style, most reliable)
    const codeBlockRegex = /```(?:[\w+#-]*)\s*\n([\s\S]*?)```/g;
    let blockMatch;

    while ((blockMatch = codeBlockRegex.exec(responseText)) !== null) {
      const block = blockMatch[1];
      const filePath = this.extractFilePathFromBlock(block);
      if (!filePath) continue;
      if (written.has(filePath)) continue;

      const content = this.stripFilePathLine(block, filePath);
      const fullPath = path.resolve(projectRoot, filePath);

      try {
        fs.ensureDirSync(path.dirname(fullPath));
        fs.writeFileSync(fullPath, content, 'utf-8');
        filesChanged.push(filePath);
        written.add(filePath);
      } catch (err) {
        this.log(`Failed to write ${filePath}: ${err}`);
      }
    }

    // Strategy 2: ```lang filepath\n...\n``` (inline path)
    const inlinePathRegex = /```([\w+#-]+)\s+([^\s\n`]+\.[\w]+)\s*\n([\s\S]*?)```/g;
    let inlineMatch;
    while ((inlineMatch = inlinePathRegex.exec(responseText)) !== null) {
      const filePath = inlineMatch[2].trim();
      if (written.has(filePath)) continue;
      const content = inlineMatch[3];
      const fullPath = path.resolve(projectRoot, filePath);

      try {
        fs.ensureDirSync(path.dirname(fullPath));
        fs.writeFileSync(fullPath, content, 'utf-8');
        filesChanged.push(filePath);
        written.add(filePath);
      } catch (err) {
        this.log(`Failed to write ${filePath}: ${err}`);
      }
    }

    return filesChanged;
  }

  private extractFilePathFromBlock(block: string): string | null {
    const firstLine = block.split('\n')[0].trim();

    // // path/to/file.ext
    let m = firstLine.match(/^\/\/\s*(\S+\.[\w]+)$/);
    if (m) return m[1];

    // # path/to/file.ext
    m = firstLine.match(/^#+\s*(\S+\.[\w]+)$/);
    if (m) return m[1];

    // <!-- path/to/file.ext -->
    m = firstLine.match(/^<!--\s*(\S+\.[\w]+)\s*-->$/);
    if (m) return m[1];

    // file: path/to/file.ext
    m = firstLine.match(/^file(?:path|_path)?\s*:\s*(\S+\.[\w]+)$/i);
    if (m) return m[1];

    // plain path/to/file.ext (but not import/package lines)
    m = firstLine.match(/^(\S+\.[\w]+)$/);
    if (m && !firstLine.startsWith('import') && !firstLine.startsWith('#include') && !firstLine.startsWith('package')) {
      return m[1];
    }

    return null;
  }

  private stripFilePathLine(block: string, filePath: string): string {
    const lines = block.split('\n');
    const firstLine = lines[0].trim();

    if (firstLine.includes(filePath)) {
      return lines.slice(1).join('\n');
    }

    return block;
  }

  private buildPrompt(context: AgentContext): string {
    if (this.config.type === 'initializer') {
      return this.buildInitializerPrompt(context);
    }
    return this.buildCodingPrompt(context);
  }

  private buildInitializerPrompt(context: AgentContext): string {
    if (context.latteMdContent) {
      return this.buildLATTEParserPrompt(context.latteMdContent);
    }
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

  private buildLATTEParserPrompt(latteContent: string): string {
    return `你是一个 LATTE.md 解析器。你的任务是将 LATTE.md 中的项目需求拆分为详细的功能列表。

LATTE.md 内容：
\`\`\`
${latteContent}
\`\`\`

请分析上述内容，将其拆分为多个功能点。每个功能点应该是一个独立的、可实现的任务。

请按照以下 JSON 格式返回结果（不要包含其他文字，只返回 JSON）：
\`\`\`json
[
  {
    "description": "功能描述",
    "priority": "high|medium|low",
    "category": "functional|non-functional|bugfix|refactor",
    "steps": ["步骤1", "步骤2", "..."],
    "test_cases": [
      {
        "description": "测试用例描述",
        "expected_result": "预期结果"
      }
    ]
  }
]
\`\`\`

要求：
1. 每个功能点应该是独立的、可测试的
2. 优先级根据重要性设置：
   - high: 核心功能，必须优先实现
   - medium: 重要功能，应该尽早实现
   - low: 增强功能，可以后续实现
3. 分类：
   - functional: 功能需求
   - non-functional: 非功能需求（性能、安全等）
   - bugfix: 修复问题
   - refactor: 重构代码
4. 每个功能应该有明确的实现步骤
5. 每个功能应该有对应的测试用例

请严格按照上述 JSON 格式返回结果，不要添加任何额外的文字或说明。`;
  }

  private buildCodingPrompt(context: AgentContext): string {
    const feature = context.feature;
    const progress = context.progress;
    const steps = feature?.steps.map((s, i) => `${i + 1}. ${s}`).join('\n') || '';

    return `你是一个编码 Agent。请实现以下功能。只输出代码文件，不要输出任何解释文字。

## 当前任务
- ID: ${feature?.id || 'N/A'}
- 描述: ${feature?.description || 'N/A'}
- 优先级: ${feature?.priority || 'N/A'}

实现步骤：
${steps}

## 已完成的工作
${progress?.completed_work.map(w => `- ${w}`).join('\n') || '无'}

## 输出格式（严格遵守）

每个文件必须按以下格式输出，代码块的第一行是文件路径注释：

\`\`\`swift
// Sources/AppDelegate.swift
import Cocoa
// 完整代码
\`\`\`

\`\`\`swift
// Sources/FnKeyMonitor.swift
import Cocoa
// 完整代码
\`\`\`

规则：
1. 每个代码块的第一行必须是 "// 文件路径"
2. 文件路径相对于项目根目录
3. 必须输出完整的文件内容，不要省略任何部分
4. 必须输出所有需要创建或修改的文件
5. 不要在代码块前后添加任何解释文字
6. 不要使用省略号(...)代替代码`;
  }
}
