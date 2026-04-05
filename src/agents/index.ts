import { BaseAgent } from './BaseAgent';
import { ClaudeAgent } from './ClaudeAgent';
import { TraeAgent } from './TraeAgent';
import { LatteAgent } from './LatteAgent';
import { AgentConfig } from '../types';

export { BaseAgent, ClaudeAgent, TraeAgent, LatteAgent };

export function createAgent(config: AgentConfig): BaseAgent {
  switch (config.model) {
    case 'claude':
      return new ClaudeAgent(config);
    case 'trae':
      return new TraeAgent(config);
    case 'latte':
      return new LatteAgent(config);
    default:
      throw new Error(`Unknown model: ${config.model}`);
  }
}
