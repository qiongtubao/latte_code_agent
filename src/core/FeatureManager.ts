import { StateManager } from './StateManager';
import { Logger } from '../utils/logger';
import { Feature, FeatureList } from '../types';
import { fileExists, readText, getProjectRoot } from '../utils';
import * as path from 'path';

export class FeatureManager {
  private stateManager: StateManager;
  private logger: Logger;

  constructor(projectRoot: string = getProjectRoot()) {
    this.stateManager = new StateManager(projectRoot);
    this.logger = new Logger();
  }

  async parseLATTEMd(): Promise<Feature[]> {
    const projectRoot = getProjectRoot();
    const latteMdPath = path.join(projectRoot, 'LATTE.md');

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
    await this.stateManager.updateFeatureStatus(featureId, 'blocked');
    this.logger.warn(`Feature ${featureId} blocked: ${reason}`);
  }

  private extractFeatures(content: string): Feature[] {
    const features: Feature[] = [];
    const lines = content.split('\n');

    let currentFeature: Partial<Feature> | null = null;
    let featureCounter = 1;

    for (const line of lines) {
      const featureMatch = line.match(/^##\s+(.+)$/);
      if (featureMatch) {
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
}
