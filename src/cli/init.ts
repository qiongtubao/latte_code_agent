import { Command } from 'commander';
import { FeatureManager, StateManager } from '../core';
import { GitManager, Logger, fileExists, getProjectRoot, ensureLatteDir } from '../utils';
import * as path from 'path';
import * as fs from 'fs-extra';

const logger = new Logger();

export const initCommand = new Command('init')
  .description('Initialize the project and create feature list')
  .option('-n, --name <name>', 'Project name')
  .option('-f, --force', 'Force reinitialize', false)
  .action(async (options) => {
    try {
      const projectRoot = getProjectRoot();
      const projectName = options.name || path.basename(projectRoot);

      logger.title('Initializing Latte Code Agent Project');

      const latteDir = path.join(projectRoot, '.latte');
      if (await fileExists(latteDir)) {
        if (!options.force) {
          logger.warn('Project already initialized. Use --force to reinitialize.');
          return;
        }
        logger.info('Removing existing .latte directory...');
        await fs.remove(latteDir);
      }

      await ensureLatteDir(projectRoot);

      const stateManager = new StateManager(projectRoot);
      await stateManager.initialize();
      await stateManager.createInitialState();
      await stateManager.createInitialProgress();

      const gitManager = new GitManager(projectRoot);
      const isGitRepo = await gitManager.isRepo();
      if (!isGitRepo) {
        logger.info('Initializing Git repository...');
        await gitManager.init();
      }

      const latteMdPath = path.join(projectRoot, 'LATTE.md');
      if (await fileExists(latteMdPath)) {
        logger.info('Parsing LATTE.md file...');
        const featureManager = new FeatureManager(projectRoot);
        const featureList = await featureManager.createFeatureList(projectName);

        logger.success(`Created feature list with ${featureList.features.length} features`);

        const highPriority = featureList.features.filter((f) => f.priority === 'high');
        if (highPriority.length > 0) {
          logger.section('High Priority Features');
          logger.list(highPriority.map((f) => `${f.id}: ${f.description}`));
        }
      } else {
        logger.warn('LATTE.md file not found. Creating empty feature list...');
        await stateManager.createInitialFeatureList(projectName);
      }

      const initScriptPath = path.join(projectRoot, 'init.sh');
      if (!(await fileExists(initScriptPath))) {
        const initScript = `#!/bin/bash
# Latte Code Agent Initialization Script
# This script sets up the development environment

echo "Initializing project..."

# Add your initialization commands here
# Example:
# npm install
# npm run build

echo "Project initialized successfully!"
`;
        await fs.writeFile(initScriptPath, initScript, 'utf-8');
        await fs.chmod(initScriptPath, '755');
        logger.success('Created init.sh script');
      }

      if (await gitManager.hasChanges()) {
        await gitManager.add();
        await gitManager.commit('chore: initialize latte-code-agent');
        logger.success('Created initial Git commit');
      }

      logger.success('Project initialization completed!');
      logger.info('Next steps:');
      logger.list([
        'Review and update LATTE.md with your project requirements',
        'Run "latte-code-agent run" to start working on the first feature',
        'Run "latte-code-agent loop" to automatically process all features',
      ]);
    } catch (error) {
      logger.error('Initialization failed');
      console.error(error);
      process.exit(1);
    }
  });
