import { Command } from 'commander';
import { StateManager } from '../core';
import { Logger, getProjectRoot, fileExists } from '../utils';
import * as path from 'path';

const logger = new Logger();

export const loopCommand = new Command('loop')
  .description('Loop through all pending features')
  .option('-m, --model <model>', 'Model to use (latte, claude, trae)', 'claude')
  .option('--max-iterations <number>', 'Maximum number of iterations', '10')
  .option('--stop-on-failure', 'Stop loop on first failure', false)
  .option('--delay <ms>', 'Delay between iterations in milliseconds', '1000')
  .action(async (options) => {
    try {
      const projectRoot = getProjectRoot();
      const latteDir = path.join(projectRoot, '.latte');

      if (!(await fileExists(latteDir))) {
        logger.error('Project not initialized. Run "latte-code-agent init" first.');
        process.exit(1);
      }

      logger.title('Starting Latte Code Agent Loop');

      const stateManager = new StateManager(projectRoot);
      const maxIterations = parseInt(options.maxIterations, 10);
      const delay = parseInt(options.delay, 10);
      let iteration = 0;
      let completedCount = 0;
      let failedCount = 0;

      while (iteration < maxIterations) {
        iteration++;

        logger.section(`Iteration ${iteration}/${maxIterations}`);

        const featureList = await stateManager.loadFeatureList();
        if (!featureList) {
          logger.error('Feature list not found');
          break;
        }

        const pendingFeatures = featureList.features.filter((f) => f.status === 'pending');
        if (pendingFeatures.length === 0) {
          logger.success('All features completed!');
          break;
        }

        logger.info(`Pending features: ${pendingFeatures.length}`);

        try {
          const { runCommand } = await import('./run');
          await runCommand.parseAsync(['node', 'latte-code-agent', 'run', '-m', options.model], {
            from: 'user',
          });

          completedCount++;
          logger.success(`Iteration ${iteration} completed successfully`);

          if (iteration < maxIterations && delay > 0) {
            logger.info(`Waiting ${delay}ms before next iteration...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        } catch (error) {
          failedCount++;
          logger.error(`Iteration ${iteration} failed`);

          if (options.stopOnFailure) {
            logger.error('Stopping loop due to failure');
            break;
          }

          logger.warn('Continuing to next iteration...');
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
