import {
  FeatureList,
  Feature,
  Progress,
  AgentState,
  Statistics,
} from '../types';
import {
  readJSON,
  writeJSON,
  readText,
  writeText,
  getFeatureListPath,
  getProgressPath,
  getStatePath,
  ensureLatteDir,
  fileExists,
  generateId,
  formatDate,
} from '../utils';

export class StateManager {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  async initialize(): Promise<void> {
    await ensureLatteDir(this.projectRoot);
  }

  async loadFeatureList(): Promise<FeatureList | null> {
    const path = getFeatureListPath(this.projectRoot);
    if (await fileExists(path)) {
      return readJSON<FeatureList>(path);
    }
    return null;
  }

  async saveFeatureList(featureList: FeatureList): Promise<void> {
    const path = getFeatureListPath(this.projectRoot);
    featureList.updated_at = formatDate();
    await writeJSON(path, featureList);
  }

  async loadProgress(): Promise<Progress | null> {
    const path = getProgressPath(this.projectRoot);
    if (await fileExists(path)) {
      const content = await readText(path);
      return this.parseProgressMarkdown(content);
    }
    return null;
  }

  async saveProgress(progress: Progress): Promise<void> {
    const path = getProgressPath(this.projectRoot);
    const content = this.generateProgressMarkdown(progress);
    await writeText(path, content);
  }

  async loadState(): Promise<AgentState | null> {
    const path = getStatePath(this.projectRoot);
    if (await fileExists(path)) {
      return readJSON<AgentState>(path);
    }
    return null;
  }

  async saveState(state: AgentState): Promise<void> {
    const path = getStatePath(this.projectRoot);
    await writeJSON(path, state);
  }

  async createInitialFeatureList(projectName: string): Promise<FeatureList> {
    const featureList: FeatureList = {
      project_name: projectName,
      created_at: formatDate(),
      updated_at: formatDate(),
      features: [],
    };
    await this.saveFeatureList(featureList);
    return featureList;
  }

  async createInitialProgress(): Promise<Progress> {
    const progress: Progress = {
      session_id: generateId(),
      started_at: formatDate(),
      completed_work: [],
      issues: [],
      next_steps: [],
      git_commits: [],
    };
    await this.saveProgress(progress);
    return progress;
  }

  async createInitialState(): Promise<AgentState> {
    const state: AgentState = {
      version: '0.1.0',
      last_run: formatDate(),
      total_sessions: 0,
      statistics: this.getDefaultStatistics(),
    };
    await this.saveState(state);
    return state;
  }

  async getNextPendingFeature(): Promise<Feature | null> {
    const featureList = await this.loadFeatureList();
    if (!featureList) return null;

    const pendingFeatures = featureList.features.filter(
      (f) => f.status === 'pending'
    );

    if (pendingFeatures.length === 0) return null;

    pendingFeatures.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    return pendingFeatures[0];
  }

  async updateFeatureStatus(
    featureId: string,
    status: Feature['status']
  ): Promise<void> {
    const featureList = await this.loadFeatureList();
    if (!featureList) return;

    const feature = featureList.features.find((f) => f.id === featureId);
    if (feature) {
      feature.status = status;
      if (status === 'completed') {
        feature.completed_at = formatDate();
      }
      await this.saveFeatureList(featureList);
    }
  }

  async updateStatistics(statistics: Partial<Statistics>): Promise<void> {
    const state = await this.loadState();
    if (state) {
      state.statistics = { ...state.statistics, ...statistics };
      await this.saveState(state);
    }
  }

  private getDefaultStatistics(): Statistics {
    return {
      total_features: 0,
      completed_features: 0,
      failed_features: 0,
      total_tests: 0,
      passed_tests: 0,
      failed_tests: 0,
    };
  }

  private parseProgressMarkdown(_content: string): Progress {
    return {
      session_id: generateId(),
      started_at: formatDate(),
      completed_work: [],
      issues: [],
      next_steps: [],
      git_commits: [],
    };
  }

  private generateProgressMarkdown(progress: Progress): string {
    return `# Latte Code Agent 进度日志

## 会话: ${progress.started_at}

### 当前任务
${progress.current_task ? `- 任务ID: ${progress.current_task}` : '- 无'}

### 完成的工作
${progress.completed_work.map((w) => `- ${w}`).join('\n') || '- 无'}

### 遇到的问题
${progress.issues
  .map((i) => `- 问题: ${i.description}\n  - 解决方案: ${i.solution || '待解决'}`)
  .join('\n') || '- 无'}

### 下一步计划
${progress.next_steps.map((s) => `- ${s}`).join('\n') || '- 无'}

### Git 提交
${progress.git_commits.map((c) => `- ${c}`).join('\n') || '- 无'}
`;
  }
}
