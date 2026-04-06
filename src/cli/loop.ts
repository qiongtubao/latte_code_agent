import { Command } from 'commander';
import { StateManager } from '../core';
import { Logger } from '../utils';
import { runSingleFeature } from './shared';

const logger = new Logger();

export const loopCommand = new Command('loop')
  .description('Loop through all pending features')
  .option('-m, --model <model>', 'Model to use (latte, claude, trae)', 'claude')
  .option('--model-name <name>', 'Specific model name (e.g. glm-5.1)')
  .option('--max-iterations <number>', 'Maximum number of iterations', '10')
  .option('--stop-on-failure', 'Stop loop on first failure', false)
  .option('--delay <ms>', 'Delay between iterations in milliseconds', '1000')
  .option('--no-test', 'Skip running tests', false)
  .option('--no-commit', 'Skip Git commit', false)
  .action(async (options) => {
    try {
      const projectRoot = process.cwd();
      const stateManager = new StateManager(projectRoot);

      logger.title('Starting Latte Code Agent Loop');

      const maxIterations = parseInt(options.maxIterations, 10);
      const delay = parseInt(options.delay, 10);
      let iteration = 0;
      let completedCount = 0;
      let failedCount = 0;

      while (iteration < maxIterations) {
        iteration++;

        // Check pending features
        const featureList = await stateManager.loadFeatureList();
        if (!featureList) {
          logger.error('Feature list not found');
          break;
        }

        const pendingFeatures = featureList.features.filter(
          (f) => f.status === 'pending' || f.status === 'in_progress' || f.status === 'blocked'
        );
        if (pendingFeatures.length === 0) {
          logger.success('All features completed!');
          break;
        }

        logger.section(`Iteration ${iteration}/${maxIterations}`);
        logger.info(`Pending features: ${pendingFeatures.length}`);

        try {
          const result = await runSingleFeature({
            model: options.model,
            modelName: options.modelName,
            skipTest: options.noTest === true,
            skipCommit: options.noCommit === true,
          });

          if (result.success) {
            completedCount++;
            logger.success(`Iteration ${iteration} completed successfully`);
          } else {
            failedCount++;
            logger.error(`Iteration ${iteration} failed: Feature ${result.featureId}`);
            logger.info('Loop stopped. Run "latte-code-agent loop" again to retry.');
            break;
          }

          if (iteration < maxIterations && delay > 0) {
            logger.info(`Waiting ${delay}ms before next iteration...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        } catch (error) {
          failedCount++;
          const msg = error instanceof Error ? error.message : String(error);

          if (msg === 'NO_PENDING_FEATURES') {
            logger.success('No more pending features!');
            break;
          }

          logger.error(`Iteration ${iteration} failed: ${msg}`);

          if (options.stopOnFailure) {
            logger.error('Stopping loop due to failure');
            break;
          }

          logger.warn('Continuing to next iteration...');

          if (iteration < maxIterations && delay > 0) {
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      logger.title('Loop Completed');
      logger.info(`Total iterations: ${iteration}`);
      logger.info(`Completed: ${completedCount}`);
      logger.info(`Failed: ${failedCount}`);

      if (failedCount > 0) {
        process.exit(1);
      }
    } catch (error) {
      logger.error('Loop command failed');
      console.error(error);
      process.exit(1);
    }
  });
