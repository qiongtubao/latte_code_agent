import * as fs from 'fs-extra';
import * as path from 'path';
import { fileExists, getProjectRoot } from './fileSystem';

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

const CONFIG_FILE = '.latterc';

export async function loadConfig(projectRoot: string = getProjectRoot()): Promise<Config> {
  const configPath = path.join(projectRoot, CONFIG_FILE);
  
  if (await fileExists(configPath)) {
    const userConfig = await fs.readJson(configPath);
    return { ...DEFAULT_CONFIG, ...userConfig };
  }
  
  return DEFAULT_CONFIG;
}

export async function saveConfig(config: Config, projectRoot: string = getProjectRoot()): Promise<void> {
  const configPath = path.join(projectRoot, CONFIG_FILE);
  await fs.writeJson(configPath, config, { spaces: 2 });
}

export function getDefaultConfig(): Config {
  return { ...DEFAULT_CONFIG };
}

export async function loadEnvConfig(): Promise<void> {
  const envPath = path.join(getProjectRoot(), '.env');
  if (await fileExists(envPath)) {
    const dotenv = await import('dotenv');
    dotenv.config({ path: envPath });
  }
}
