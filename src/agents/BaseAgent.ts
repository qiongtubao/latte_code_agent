import { Feature, AgentConfig, Progress } from '../types';
import { Logger } from '../utils';

export abstract class BaseAgent {
  protected config: AgentConfig;
  protected logger: Logger;

  constructor(config: AgentConfig) {
    this.config = config;
    this.logger = new Logger();
  }

  abstract execute(context: AgentContext): Promise<AgentResult>;

  protected log(message: string): void {
    this.logger.info(`[${this.config.type}] ${message}`);
  }
}

export interface AgentContext {
  projectRoot: string;
  feature?: Feature;
  progress?: Progress;
  previousResults?: AgentResult[];
}

export interface AgentResult {
  success: boolean;
  message: string;
  data?: unknown;
  error?: Error;
  files_changed?: string[];
  tests_passed?: boolean;
}
