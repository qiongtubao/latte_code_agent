import * as path from 'path';
import * as fs from 'fs-extra';
import { fileExists } from './fileSystem';

export type ProjectLanguage = 'swift' | 'c' | 'cpp' | 'node' | 'python' | 'go' | 'rust' | 'unknown';

export interface ProjectToolchain {
  language: ProjectLanguage;
  compileCommand: string[];
  testCommand: string[];
  lintCommand: string[] | null;
  buildDir: string;
}

const TOOLCHAINS: Record<ProjectLanguage, (root: string) => ProjectToolchain> = {
  swift: (root) => ({
    language: 'swift',
    compileCommand: ['swift', 'build'],
    testCommand: ['swift', 'test'],
    lintCommand: ['swiftlint', 'lint'],
    buildDir: path.join(root, '.build'),
  }),
  c: (root) => ({
    language: 'c',
    compileCommand: ['make', 'build'],
    testCommand: ['make', 'test'],
    lintCommand: null,
    buildDir: path.join(root, 'build'),
  }),
  cpp: (root) => ({
    language: 'cpp',
    compileCommand: ['make', 'build'],
    testCommand: ['make', 'test'],
    lintCommand: null,
    buildDir: path.join(root, 'build'),
  }),
  node: (root) => ({
    language: 'node',
    compileCommand: ['npm', 'run', 'build'],
    testCommand: ['npm', 'test'],
    lintCommand: ['npm', 'run', 'lint'],
    buildDir: path.join(root, 'dist'),
  }),
  python: (root) => ({
    language: 'python',
    compileCommand: [],
    testCommand: ['pytest'],
    lintCommand: ['ruff', 'check'],
    buildDir: root,
  }),
  go: (root) => ({
    language: 'go',
    compileCommand: ['go', 'build', './...'],
    testCommand: ['go', 'test', './...'],
    lintCommand: null,
    buildDir: root,
  }),
  rust: (root) => ({
    language: 'rust',
    compileCommand: ['cargo', 'build'],
    testCommand: ['cargo', 'test'],
    lintCommand: ['cargo', 'clippy'],
    buildDir: path.join(root, 'target'),
  }),
  unknown: (root) => ({
    language: 'unknown',
    compileCommand: [],
    testCommand: [],
    lintCommand: null,
    buildDir: root,
  }),
};

export async function detectProjectLanguage(projectRoot: string): Promise<ProjectLanguage> {
  const checks: [string, ProjectLanguage][] = [
    ['Package.swift', 'swift'],
    ['CMakeLists.txt', 'cpp'],
    ['Cargo.toml', 'rust'],
    ['go.mod', 'go'],
    ['pyproject.toml', 'python'],
    ['setup.py', 'python'],
    ['package.json', 'node'],
    ['Makefile', 'c'],
  ];

  for (const [file, lang] of checks) {
    if (await fileExists(path.join(projectRoot, file))) {
      return lang;
    }
  }

  // Check for .c/.h files without Makefile
  try {
    const files = await fs.readdir(projectRoot);
    if (files.some(f => f.endsWith('.c') || f.endsWith('.h'))) {
      return 'c';
    }
  } catch {}

  return 'unknown';
}

export async function getProjectToolchain(projectRoot: string): Promise<ProjectToolchain> {
  const lang = await detectProjectLanguage(projectRoot);
  return TOOLCHAINS[lang](projectRoot);
}
