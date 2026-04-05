import { Command } from 'commander';
import { FeatureManager, StateManager } from '../core';
import { createAgent } from '../agents';
import { GitManager, Logger, getProjectRoot, fileExists } from '../utils';
import { AgentConfig } from '../types';
import * as path from 'path';

const logger = new Logger();

export const runCommand = new Command('run')
  .description('Run a single task from the feature list')
  .option('-m, --model <model>', 'Model to use (latte, claude, trae)', 'claude')
  .option('-f, --feature <featureId>', 'Specific feature ID to work on')
  .option('--no-test', 'Skip running tests', false)
  .option('--no-commit', 'Skip Git commit', false)
  .action(async (options) => {
    try {
      const projectRoot = getProjectRoot();
      const latteDir = path.join(projectRoot, '.latte');

      if (!(await fileExists(latteDir))) {
        logger.error('Project not initialized. Run "latte-code-agent init" first.');
        process.exit(1);
      }

      logger.title('Running Latte Code Agent');

      const stateManager = new StateManager(projectRoot);
      const featureManager = new FeatureManager(projectRoot);
      const gitManager = new GitManager(projectRoot);

      const progress = await stateManager.loadProgress();
      const state = await stateManager.loadState();

      if (!progress || !state) {
        logger.error('Project state not found. Run "latte-code-agent init" first.');
        process.exit(1);
      }

      logger.section('Getting Context');
      logger.info(`Working directory: ${projectRoot}`);

      const gitLogs = await gitManager.log(5);
      if (gitLogs.length > 0) {
        logger.info('Recent commits:');
        logger.list(gitLogs.map((log) => `${log.hash.substring(0, 7)}: ${log.message}`));
      }

      let feature;
      if (options.feature) {
        const featureList = await stateManager.loadFeatureList();
        feature = featureList?.features.find((f) => f.id === options.feature);
        if (!feature) {
          logger.error(`Feature ${options.feature} not found`);
          process.exit(1);
        }
      } else {
        feature = await featureManager.selectNextFeature();
        if (!feature) {
          logger.success('No pending features found. All tasks completed!');
          process.exit(0);
        }
      }

      logger.section('Selected Feature');
      logger.info(`ID: ${feature.id}`);
      logger.info(`Description: ${feature.description}`);
      logger.info(`Priority: ${feature.priority}`);
      logger.info(`Steps:`);
      logger.list(feature.steps);

      await stateManager.updateFeatureStatus(feature.id, 'in_progress');

      const agentConfig: AgentConfig = {
        type: 'coding',
        model: options.model,
        max_retries: 3,
        timeout: 300000,
      };

      const agent = createAgent(agentConfig);

      logger.section('Executing Agent');
      logger.info(`Using ${options.model} model...`);

      const result = await agent.execute({
        projectRoot,
        feature,
        progress,
      });

      if (result.success) {
        logger.success('Agent execution completed successfully');

        if (!options.noTest) {
          logger.section('Running Tests');
          const { TestManager } = await import('../core');
          const testManager = new TestManager(projectRoot);
          const testResult = await testManager.runTests(feature);

          if (testResult.tests.unit.failed > 0 || testResult.tests.integration.failed > 0) {
            logger.warn('Some tests failed. Review the test output.');
            result.tests_passed = false;
          } else {
            logger.success('All tests passed');
            result.tests_passed = true;
          }
        }

        if (!options.noCommit && result.files_changed && result.files_changed.length > 0) {
          logger.section('Committing Changes');
          await gitManager.add(result.files_changed);
          const commitHash = await gitManager.commit(`feat: ${feature.description}`);
          logger.success(`Committed changes: ${commitHash}`);
        }

        await featureManager.completeFeature(feature.id);
        logger.success(`Feature ${feature.id} completed!`);
      } else {
        logger.error('Agent execution failed');
        if (result.error) {
          logger.error(result.error.message);
        }
        await featureManager.blockFeature(feature.id, result.message);
        process.exit(1);
      }

      state.last_run = new Date().toISOString();
      state.total_sessions += 1;
      await stateManager.saveState(state);
    } catch (error) {
      logger.error('Run command failed');
      console.error(error);
      process.exit(1);
    }
  });
