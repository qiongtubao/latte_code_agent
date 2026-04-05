import { BaseAgent, AgentContext, AgentResult } from './BaseAgent';
import { AgentConfig } from '../types';

export class LatteAgent extends BaseAgent {
  constructor(config: AgentConfig) {
    super(config);
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const prompt = this.buildPrompt(context);
      
      this.log('Latte agent is executing...');
      this.log(`Prompt: ${prompt.substring(0, 100)}...`);

      return {
        success: true,
        message: 'Latte agent executed successfully (placeholder)',
        data: {
          prompt,
          note: 'This is a placeholder. Implement actual Latte API integration here.',
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Latte agent execution failed',
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
    return `Initialize project at ${context.projectRoot}`;
  }

  private buildCodingPrompt(context: AgentContext): string {
    return `Implement feature ${context.feature?.id}: ${context.feature?.description}`;
  }
}
