import { Command } from 'commander';
import { Logger } from '../utils';
import { runSingleFeature } from './shared';

const logger = new Logger();

export const runCommand = new Command('run')
  .description('Run a single task from the feature list')
  .option('-m, --model <model>', 'Model to use (latte, claude, trae)', 'claude')
  .option('--model-name <name>', 'Specific model name (e.g. glm-5.1)')
  .option('-f, --feature <featureId>', 'Specific feature ID to work on')
  .option('--no-test', 'Skip running tests', false)
  .option('--no-commit', 'Skip Git commit', false)
  .action(async (options) => {
    try {
      await runSingleFeature({
        model: options.model,
        modelName: options.modelName,
        featureId: options.feature,
        skipTest: options.noTest === true,
        skipCommit: options.noCommit === true,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'NO_PENDING_FEATURES') {
        logger.success('No pending features found. All tasks completed!');
        process.exit(0);
      }
      logger.error('Run command failed');
      console.error(error);
      process.exit(1);
    }
  });
