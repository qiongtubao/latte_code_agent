#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './init';
import { runCommand } from './run';
import { loopCommand } from './loop';
import { testCommand } from './test';
import { Logger } from '../utils';

const logger = new Logger();

const program = new Command();

program
  .name('latte-code-agent')
  .description('A code generation agent based on Latte model with Claude and Trae integration')
  .version('0.1.0');

program.addCommand(initCommand);
program.addCommand(runCommand);
program.addCommand(loopCommand);
program.addCommand(testCommand);

program
  .command('status')
  .description('Show project status')
  .action(async () => {
    try {
      const { StateManager } = await import('../core');
      const { getProjectRoot, fileExists } = await import('../utils');
      const path = await import('path');

      const projectRoot = getProjectRoot();
      const latteDir = path.join(projectRoot, '.latte');

      if (!(await fileExists(latteDir))) {
        logger.error('Project not initialized. Run "latte-code-agent init" first.');
        process.exit(1);
      }

      const stateManager = new StateManager(projectRoot);
      const state = await stateManager.loadState();
      const featureList = await stateManager.loadFeatureList();

      if (!state || !featureList) {
        logger.error('Project state not found');
        process.exit(1);
      }

      logger.title('Project Status');
      logger.info(`Project: ${featureList.project_name}`);
      logger.info(`Version: ${state.version}`);
      logger.info(`Last run: ${state.last_run}`);
      logger.info(`Total sessions: ${state.total_sessions}`);

      logger.section('Features');
      const statusCounts = {
        pending: 0,
        in_progress: 0,
        completed: 0,
        blocked: 0,
      };

      featureList.features.forEach((f) => {
        statusCounts[f.status]++;
      });

      logger.info(`Total: ${featureList.features.length}`);
      logger.info(`Pending: ${statusCounts.pending}`);
      logger.info(`In Progress: ${statusCounts.in_progress}`);
      logger.info(`Completed: ${statusCounts.completed}`);
      logger.info(`Blocked: ${statusCounts.blocked}`);

      logger.section('Statistics');
      logger.info(`Total tests: ${state.statistics.total_tests}`);
      logger.info(`Passed tests: ${state.statistics.passed_tests}`);
      logger.info(`Failed tests: ${state.statistics.failed_tests}`);
    } catch (error) {
      logger.error('Status command failed');
      console.error(error);
      process.exit(1);
    }
  });

program.parse();
