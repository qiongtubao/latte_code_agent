import * as path from 'path';
import * as fs from 'fs-extra';

const LATTE_DIR = '.latte';

export function getLatteDir(projectRoot: string): string {
  return path.join(projectRoot, LATTE_DIR);
}

export function getFeatureListPath(projectRoot: string): string {
  return path.join(getLatteDir(projectRoot), 'feature_list.json');
}

export function getProgressPath(projectRoot: string): string {
  return path.join(getLatteDir(projectRoot), 'progress.md');
}

export function getStatePath(projectRoot: string): string {
  return path.join(getLatteDir(projectRoot), 'state.json');
}

export function getConfigPath(projectRoot: string): string {
  return path.join(getLatteDir(projectRoot), 'config.json');
}

export async function ensureLatteDir(projectRoot: string): Promise<void> {
  const latteDir = getLatteDir(projectRoot);
  await fs.ensureDir(latteDir);
}

export async function fileExists(filePath: string): Promise<boolean> {
  return fs.pathExists(filePath);
}

export async function readJSON<T>(filePath: string): Promise<T> {
  return fs.readJson(filePath);
}

export async function writeJSON<T>(filePath: string, data: T): Promise<void> {
  await fs.writeJson(filePath, data, { spaces: 2 });
}

export async function readText(filePath: string): Promise<string> {
  return fs.readFile(filePath, 'utf-8');
}

export async function writeText(filePath: string, content: string): Promise<void> {
  await fs.writeFile(filePath, content, 'utf-8');
}

export function getProjectRoot(): string {
  return process.cwd();
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function formatDate(date: Date = new Date()): string {
  return date.toISOString();
}
