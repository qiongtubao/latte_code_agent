import { BaseAgent, AgentContext, AgentResult } from './BaseAgent';
import { AgentConfig } from '../types';
import { RunCommand } from '../utils/command';

export class TraeAgent extends BaseAgent {
  constructor(config: AgentConfig) {
    super(config);
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const prompt = this.buildPrompt(context);
      
      const result = await this.executeTraeCommand(prompt, context.projectRoot);

      return {
        success: result.success,
        message: result.message,
        data: result.output,
        files_changed: result.files_changed,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Trae agent execution failed',
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  private async executeTraeCommand(
    prompt: string,
    projectRoot: string
  ): Promise<{ success: boolean; message: string; output?: string; files_changed?: string[] }> {
    try {
      const result = await RunCommand.execute(
        'trae',
        ['--prompt', prompt],
        { cwd: projectRoot }
      );

      return {
        success: true,
        message: 'Trae command executed successfully',
        output: result.stdout,
      };
    } catch (error) {
      return {
        success: false,
        message: `Trae command failed: ${error instanceof Error ? error.message : String(error)}`,
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
    return `Initialize the project at ${context.projectRoot}. Read LATTE.md and create the initial project structure with feature list.`;
  }

  private buildCodingPrompt(context: AgentContext): string {
    const feature = context.feature;
    return `Implement feature ${feature?.id}: ${feature?.description}. Write tests and ensure the code compiles.`;
  }
}
