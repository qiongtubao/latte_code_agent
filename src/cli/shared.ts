import * as path from 'path';
import { StateManager, FeatureManager, TestManager } from '../core';
import { createAgent } from '../agents';
import { GitManager, Logger, fileExists, getProjectRoot } from '../utils';
import { AgentConfig, Feature } from '../types';

const logger = new Logger();

export interface RunOptions {
  model: string;
  modelName?: string;
  featureId?: string;
  skipTest?: boolean;
  skipCommit?: boolean;
}

export interface RunResult {
  success: boolean;
  featureId: string;
  testsPassed?: boolean;
}

export async function ensureInitialized(): Promise<{
  projectRoot: string;
  stateManager: StateManager;
}> {
  const projectRoot = getProjectRoot();
  const latteDir = path.join(projectRoot, '.latte');

  if (!(await fileExists(latteDir))) {
    throw new Error('Project not initialized. Run "latte-code-agent init" first.');
  }

  const stateManager = new StateManager(projectRoot);
  const state = await stateManager.loadState();

  if (!state) {
    throw new Error('Project state not found. Run "latte-code-agent init" first.');
  }

  return { projectRoot, stateManager };
}

export async function runSingleFeature(options: RunOptions): Promise<RunResult> {
  const { projectRoot, stateManager } = await ensureInitialized();
  const featureManager = new FeatureManager(projectRoot);
  const gitManager = new GitManager(projectRoot);

  const state = (await stateManager.loadState())!;
  const progress = await stateManager.loadProgress();

  // Show context
  logger.section('Getting Context');
  logger.info(`Working directory: ${projectRoot}`);
  try {
    const gitLogs = await gitManager.log(5);
    if (gitLogs.length > 0) {
      logger.info('Recent commits:');
      logger.list(gitLogs.map((log: any) => `${(log.hash || '').toString().substring(0, 7)}: ${log.message || ''}`));
    }
  } catch {
    logger.info('No commits yet');
  }

  // Select feature
  let feature: Feature;
  if (options.featureId) {
    const featureList = await stateManager.loadFeatureList();
    const found = featureList?.features.find((f) => f.id === options.featureId);
    if (!found) throw new Error(`Feature ${options.featureId} not found`);
    feature = found;
  } else {
    const next = await featureManager.selectNextFeature();
    if (!next) throw new Error('NO_PENDING_FEATURES');
    feature = next;
  }

  logger.section('Selected Feature');
  logger.info(`ID: ${feature.id}`);
  logger.info(`Description: ${feature.description}`);
  logger.info(`Priority: ${feature.priority}`);
  if (feature.steps.length > 0) {
    logger.info('Steps:');
    logger.list(feature.steps);
  }

  // Reset blocked features to pending before execution
  if (feature.status === 'blocked') {
    logger.info(`Retrying previously failed feature (reason: ${feature.blocked_reason || 'unknown'})`);
  }

  await stateManager.updateFeatureStatus(feature.id, 'in_progress');

  // Execute agent
  const agentConfig: AgentConfig = {
    type: 'coding',
    model: options.model as AgentConfig['model'],
    modelName: options.modelName,
    max_retries: 3,
    timeout: 300000,
  };

  const agent = createAgent(agentConfig);

  logger.section('Executing Agent');
  logger.info(`Using ${options.model}${options.modelName ? ` (${options.modelName})` : ''} model...`);

  const result = await agent.execute({
    projectRoot,
    feature,
    progress: progress || undefined,
  });

  if (!result.success) {
    logger.error('Agent execution failed');
    if (result.error) logger.error(result.error.message);
    await featureManager.blockFeature(feature.id, result.message);
    return { success: false, featureId: feature.id };
  }

  logger.success('Agent execution completed successfully');

  // Step 1: Compile
  if (!options.skipTest) {
    logger.section('Compiling');
    const testManager = new TestManager(projectRoot);
    const compileResult = await testManager.compile();

    if (!compileResult.success) {
      logger.warn('Compilation failed. Feature will not be marked as completed.');
      await featureManager.blockFeature(feature.id, `Compilation failed: ${compileResult.output.substring(0, 200)}`);
      state.last_run = new Date().toISOString();
      state.total_sessions += 1;
      await stateManager.saveState(state);
      return { success: false, featureId: feature.id };
    }
  }

  // Step 2: Test
  let testsPassed: boolean | undefined;
  if (!options.skipTest) {
    logger.section('Running Tests');
    const testManager = new TestManager(projectRoot);
    const testResult = await testManager.runTests(feature);

    if (testResult.tests.unit.failed > 0 || testResult.tests.integration.failed > 0) {
      logger.warn('Some tests failed. Review the test output.');
      testsPassed = false;
    } else {
      logger.success('All tests passed');
      testsPassed = true;
    }
  }

  // Step 3: Verify changes
  const hasChanges = await gitManager.hasChanges();
  if (!hasChanges && (!result.files_changed || result.files_changed.length === 0)) {
    logger.warn('No code changes detected. Feature will not be marked as completed.');
    await featureManager.blockFeature(feature.id, 'No code changes produced');
    state.last_run = new Date().toISOString();
    state.total_sessions += 1;
    await stateManager.saveState(state);
    return { success: false, featureId: feature.id };
  }

  // Step 4: Commit
  if (!options.skipCommit && hasChanges) {
    logger.section('Committing Changes');
    const filesToCommit = result.files_changed && result.files_changed.length > 0
      ? result.files_changed : undefined;
    await gitManager.add(filesToCommit);
    const commitHash = await gitManager.commit(`feat: ${feature.description}`);
    logger.success(`Committed changes: ${commitHash}`);
  }

  // Complete
  await featureManager.completeFeature(feature.id);
  logger.success(`Feature ${feature.id} completed!`);

  state.last_run = new Date().toISOString();
  state.total_sessions += 1;
  await stateManager.saveState(state);

  return { success: true, featureId: feature.id, testsPassed };
}
