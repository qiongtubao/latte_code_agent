import { Command } from 'commander';
import { TestManager, StateManager } from '../core';
import { Logger, getProjectRoot, fileExists } from '../utils';
import * as path from 'path';

const logger = new Logger();

export const testCommand = new Command('test')
  .description('Run tests and generate test report')
  .option('-f, --feature <featureId>', 'Test specific feature')
  .option('--report', 'Generate test report', true)
  .option('--report-path <path>', 'Path to save test report', 'test-report.md')
  .action(async (options) => {
    try {
      const projectRoot = getProjectRoot();
      const latteDir = path.join(projectRoot, '.latte');

      if (!(await fileExists(latteDir))) {
        logger.error('Project not initialized. Run "latte-code-agent init" first.');
        process.exit(1);
      }

      logger.title('Running Tests');

      const testManager = new TestManager(projectRoot);
      const stateManager = new StateManager(projectRoot);

      let feature;
      if (options.feature) {
        const featureList = await stateManager.loadFeatureList();
        feature = featureList?.features.find((f) => f.id === options.feature);
        if (!feature) {
          logger.error(`Feature ${options.feature} not found`);
          process.exit(1);
        }
        logger.info(`Testing feature: ${feature.id} - ${feature.description}`);
      }

      const result = await testManager.runTests(feature);

      logger.title('Test Results');
      logger.section('Unit Tests');
      logger.info(`Total: ${result.tests.unit.total}`);
      logger.info(`Passed: ${result.tests.unit.passed}`);
      logger.info(`Failed: ${result.tests.unit.failed}`);
      if (result.tests.unit.coverage) {
        logger.info(`Coverage: ${result.tests.unit.coverage}`);
      }

      logger.section('Integration Tests');
      logger.info(`Total: ${result.tests.integration.total}`);
      logger.info(`Passed: ${result.tests.integration.passed}`);
      logger.info(`Failed: ${result.tests.integration.failed}`);

      logger.section('E2E Tests');
      logger.info(`Total: ${result.tests.e2e.total}`);
      logger.info(`Passed: ${result.tests.e2e.passed}`);
      logger.info(`Failed: ${result.tests.e2e.failed}`);

      if (result.issues.length > 0) {
        logger.section('Issues');
        result.issues.forEach((issue) => {
          const severityIcon =
            issue.severity === 'critical'
              ? '🔴'
              : issue.severity === 'high'
                ? '🟠'
                : issue.severity === 'medium'
                  ? '🟡'
                  : '🟢';
          logger.warn(`${severityIcon} [${issue.type}] ${issue.message}`);
        });
      }

      if (options.report) {
        const report = await testManager.generateTestReport(result);
        const reportPath = path.join(projectRoot, options.reportPath);
        const fs = await import('fs-extra');
        await fs.writeFile(reportPath, report, 'utf-8');
        logger.success(`Test report saved to ${reportPath}`);
      }

      const totalFailed =
        result.tests.unit.failed + result.tests.integration.failed + result.tests.e2e.failed;
      if (totalFailed > 0) {
        logger.error(`${totalFailed} tests failed`);
        process.exit(1);
      } else {
        logger.success('All tests passed!');
      }
    } catch (error) {
      logger.error('Test command failed');
      console.error(error);
      process.exit(1);
    }
  });
