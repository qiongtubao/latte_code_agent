import { StateManager } from './StateManager';
import { Logger, fileExists, readText, getProjectRoot } from '../utils';
import { Feature, FeatureList } from '../types';
import { createAgent } from '../agents';
import * as path from 'path';

export class FeatureManager {
  private stateManager: StateManager;
  private logger: Logger;
  private projectRoot: string;

  constructor(projectRoot: string = getProjectRoot()) {
    this.projectRoot = projectRoot;
    this.stateManager = new StateManager(projectRoot);
    this.logger = new Logger();
  }

  async parseLATTEMd(): Promise<Feature[]> {
    const latteMdPath = path.join(this.projectRoot, 'LATTE.md');

    if (!(await fileExists(latteMdPath))) {
      throw new Error('LATTE.md file not found');
    }

    const content = await readText(latteMdPath);
    const features = this.extractFeatures(content);

    return features;
  }

  async createFeatureList(projectName: string): Promise<FeatureList> {
    const features = await this.parseLATTEMd();
    const featureList = await this.stateManager.createInitialFeatureList(projectName);

    featureList.features = features;
    await this.stateManager.saveFeatureList(featureList);

    return featureList;
  }

  async createFeatureListWithAI(
    projectName: string,
    model: 'claude' | 'trae',
    modelName?: string,
    latteMdContent?: string,
  ): Promise<FeatureList> {
    let content = latteMdContent;

    if (!content) {
      // No LATTE.md — analyze project structure instead
      this.logger.info('No LATTE.md found. Scanning project files for AI analysis...');
      content = await this.scanProjectFiles();
    }

    this.logger.info(`Using ${model} model to parse LATTE.md...`);

    const agent = createAgent({
      type: 'initializer',
      model,
      modelName,
      max_retries: 3,
      timeout: 300000,
    });

    const result = await agent.execute({
      projectRoot: this.projectRoot,
      gitCommits: [],
      latteMdContent: content,
    });

    if (!result.success) {
      const detail = result.error ? result.error.message : result.message;
      throw new Error(`AI parsing failed: ${detail}`);
    }

    const features = this.parseAIResponse(result.data as string, content);
    const featureList = await this.stateManager.createInitialFeatureList(projectName);

    featureList.features = features;
    await this.stateManager.saveFeatureList(featureList);

    return featureList;
  }

  async addFeature(feature: Feature): Promise<void> {
    const featureList = await this.stateManager.loadFeatureList();
    if (!featureList) {
      throw new Error('Feature list not initialized');
    }

    featureList.features.push(feature);
    await this.stateManager.saveFeatureList(featureList);
  }

  async selectNextFeature(): Promise<Feature | null> {
    return this.stateManager.getNextPendingFeature();
  }

  async completeFeature(featureId: string): Promise<void> {
    await this.stateManager.updateFeatureStatus(featureId, 'completed');
    this.logger.success(`Feature ${featureId} marked as completed`);
  }

  async blockFeature(featureId: string, reason: string): Promise<void> {
    // Reset to pending so next run/loop will retry this feature
    await this.stateManager.updateFeatureStatus(featureId, 'pending');
    this.logger.warn(`Feature ${featureId} failed, will retry next run: ${reason}`);
  }

  private async scanProjectFiles(): Promise<string> {
    const fs = await import('fs-extra');
    const files: string[] = [];

    // Collect key project files
    const importantFiles = [
      'README.md', 'Makefile', 'CMakeLists.txt', 'Package.swift',
      'package.json', 'Cargo.toml', 'go.mod', 'pyproject.toml',
    ];

    for (const name of importantFiles) {
      const p = path.join(this.projectRoot, name);
      if (await fileExists(p)) {
        const stat = await fs.stat(p);
        if (stat.size < 50000) {
          const content = await fs.readFile(p, 'utf-8');
          files.push(`=== ${name} ===\n${content.substring(0, 3000)}`);
        }
      }
    }

    // Scan source directories
    for (const dir of ['src', 'Sources', 'lib', 'include', 'cmd', 'internal']) {
      const dirPath = path.join(this.projectRoot, dir);
      if (await fileExists(dirPath)) {
        const entries = await fs.readdir(dirPath);
        const headerFiles = entries.filter((e: string) =>
          e.endsWith('.h') || e.endsWith('.swift') || e.endsWith('.go') || e.endsWith('.py') || e.endsWith('.ts')
        ).slice(0, 5);
        for (const f of headerFiles) {
          const fp = path.join(dirPath, f);
          const content = await fs.readFile(fp, 'utf-8');
          files.push(`=== ${dir}/${f} ===\n${content.substring(0, 1000)}`);
        }
      }
    }

    return files.join('\n\n');
  }

  private extractFeatures(content: string): Feature[] {
    const features: Feature[] = [];
    const lines = content.split('\n');

    let currentFeature: Partial<Feature> | null = null;
    let featureCounter = 1;
    let hasHeadingFeatures = false;

    for (const line of lines) {
      const featureMatch = line.match(/^##\s+(.+)$/);
      if (featureMatch) {
        hasHeadingFeatures = true;
        if (currentFeature && currentFeature.description) {
          features.push(this.createFeature(currentFeature, featureCounter++));
        }
        currentFeature = {
          description: featureMatch[1],
          steps: [],
          test_cases: [],
        };
        continue;
      }

      const stepMatch = line.match(/^-\s+(.+)$/);
      if (stepMatch && currentFeature) {
        currentFeature.steps?.push(stepMatch[1]);
      }
    }

    if (currentFeature && currentFeature.description) {
      features.push(this.createFeature(currentFeature, featureCounter));
    }

    if (!hasHeadingFeatures) {
      const trimmedContent = content.trim();
      if (trimmedContent) {
        const cleanDescription = trimmedContent
          .split('\n')
          .filter(line => !line.match(/^#+\s*/))
          .join(' ')
          .trim();
        
        if (cleanDescription) {
          features.push(this.createFeature({
            description: cleanDescription,
            steps: [],
            test_cases: [],
          }, featureCounter));
        }
      }
    }

    return features;
  }

  private createFeature(partial: Partial<Feature>, counter: number): Feature {
    return {
      id: `F${String(counter).padStart(3, '0')}`,
      category: 'functional',
      description: partial.description || '',
      priority: 'medium',
      steps: partial.steps || [],
      status: 'pending',
      test_cases: partial.test_cases || [],
    };
  }

  private parseAIResponse(response: string, originalContent: string): Feature[] {
    try {
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || 
                        response.match(/```\s*([\s\S]*?)\s*```/) ||
                        [null, response];
      
      let jsonStr = jsonMatch[1] || response;
      
      const bracketStart = jsonStr.indexOf('[');
      const bracketEnd = jsonStr.lastIndexOf(']');
      if (bracketStart !== -1 && bracketEnd !== -1) {
        jsonStr = jsonStr.slice(bracketStart, bracketEnd + 1);
      }

      const parsed = JSON.parse(jsonStr) as Array<{
        description: string;
        priority?: string;
        category?: string;
        steps?: string[];
        test_cases?: Array<{ description: string; expected_result: string }>;
      }>;

      const features: Feature[] = [];
      let counter = 1;

      for (const item of parsed) {
        features.push({
          id: `F${String(counter++).padStart(3, '0')}`,
          description: item.description,
          priority: (item.priority as any) || 'medium',
          category: (item.category as any) || 'functional',
          steps: item.steps || [],
          status: 'pending',
          test_cases: item.test_cases?.map(tc => ({
            description: tc.description,
            expected_result: tc.expected_result,
          })) || [],
        });
      }

      return features;
    } catch (error) {
      this.logger.warn('Failed to parse AI response, falling back to simple parsing');
      return this.extractFeatures(originalContent);
    }
  }
}
