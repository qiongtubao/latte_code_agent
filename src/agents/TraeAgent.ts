import { BaseAgent, AgentContext, AgentResult } from './BaseAgent';
import { AgentConfig } from '../types';

export class TraeAgent extends BaseAgent {
  constructor(config: AgentConfig) {
    super(config);
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    console.log('');
    this.logger.warn('trae-cn is a desktop IDE, not an automated CLI tool');
    console.log('');
    this.logger.info('Please use one of these options:');
    console.log('');

    this.logger.info('Option 1: Use Claude API for automation (Recommended)');
    this.logger.info('   Set ANTHROPIC_API_KEY and run:');
    this.logger.info('   latte-code-agent run -m claude');
    console.log('');

    this.logger.info('Option 2: Use trae-cn manually');

    if (context.feature) {
      console.log('');
      this.logger.info(`Task to complete:`);
      this.logger.info(`   ID: ${context.feature.id}`);
      this.logger.info(`   Description: ${context.feature.description}`);
      console.log('');
      this.logger.info('Steps:');
      this.logger.info(`   1. Open trae-cn: trae-cn ${context.projectRoot}`);
      this.logger.info(`   2. Implement the feature manually`);
      this.logger.info(`   3. After completing, run: latte-code-agent status`);
      console.log('');
    }

    if (this.config.type === 'initializer') {
      return {
        success: false,
        message: 'Please use simple parsing or Claude API for initialization',
      };
    }

    return {
      success: false,
      message: 'trae-cn requires manual implementation. Use Claude API for automation or complete manually.',
    };
  }
}
