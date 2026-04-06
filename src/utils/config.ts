import * as fs from 'fs-extra';
import { fileExists, getProjectRoot, getConfigPath } from './fileSystem';

export interface Config {
  model: 'latte' | 'claude' | 'trae';
  maxRetries: number;
  timeout: number;
  testFramework: string;
  autoCommit: boolean;
  verbose: boolean;
}

const DEFAULT_CONFIG: Config = {
  model: 'claude',
  maxRetries: 3,
  timeout: 300000,
  testFramework: 'jest',
  autoCommit: true,
  verbose: false,
};

export async function loadConfig(projectRoot: string = getProjectRoot()): Promise<Config> {
  const configPath = getConfigPath(projectRoot);

  if (await fileExists(configPath)) {
    const userConfig = await fs.readJson(configPath);
    return { ...DEFAULT_CONFIG, ...userConfig };
  }

  return DEFAULT_CONFIG;
}

export async function saveConfig(config: Config, projectRoot: string = getProjectRoot()): Promise<void> {
  const configPath = getConfigPath(projectRoot);
  await fs.writeJson(configPath, config, { spaces: 2 });
}

export function getDefaultConfig(): Config {
  return { ...DEFAULT_CONFIG };
}
