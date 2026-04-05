import { StateManager } from './StateManager';
import { Logger, RunCommand, fileExists, getProjectRoot } from '../utils';
import { TestResult, Feature } from '../types';
import * as path from 'path';

export class TestManager {
  private stateManager: StateManager;
  private logger: Logger;
  private projectRoot: string;

  constructor(projectRoot: string = getProjectRoot()) {
    this.projectRoot = projectRoot;
    this.stateManager = new StateManager(projectRoot);
    this.logger = new Logger();
  }

  async runTests(feature?: Feature): Promise<TestResult> {
    this.logger.info('Running tests...');

    const result: TestResult = {
      timestamp: new Date().toISOString(),
      feature_id: feature?.id || 'all',
      tests: {
        unit: { total: 0, passed: 0, failed: 0 },
        integration: { total: 0, passed: 0, failed: 0 },
        e2e: { total: 0, passed: 0, failed: 0 },
      },
      issues: [],
    };

    try {
      await this.runUnitTest(result);
      await this.runIntegrationTest(result);
      await this.runE2ETest(result);

      await this.stateManager.updateStatistics({
        total_tests: result.tests.unit.total + result.tests.integration.total + result.tests.e2e.total,
        passed_tests: result.tests.unit.passed + result.tests.integration.passed + result.tests.e2e.passed,
        failed_tests: result.tests.unit.failed + result.tests.integration.failed + result.tests.e2e.failed,
      });

      return result;
    } catch (error) {
      this.logger.error('Test execution failed');
      throw error;
    }
  }

  private async runUnitTest(result: TestResult): Promise<void> {
    this.logger.section('Unit Tests');

    try {
      const packageJsonPath = path.join(this.projectRoot, 'package.json');
      if (await fileExists(packageJsonPath)) {
        const testResult = await RunCommand.execute('npm', ['test'], {
          cwd: this.projectRoot,
          timeout: 120000,
        });

        const passed = this.parseTestOutput(testResult.stdout);
        result.tests.unit = {
          total: passed.total,
          passed: passed.passed,
          failed: passed.failed,
          coverage: passed.coverage,
        };

        if (passed.failed > 0) {
          result.issues.push({
            type: 'test_failure',
            message: `${passed.failed} unit tests failed`,
            severity: 'high',
          });
        }
      }
    } catch (error) {
      this.logger.warn('Unit tests not available or failed to run');
      result.issues.push({
        type: 'test_failure',
        message: 'Unit tests failed to execute',
        severity: 'medium',
      });
    }
  }

  private async runIntegrationTest(result: TestResult): Promise<void> {
    this.logger.section('Integration Tests');

    try {
      const integrationTestPath = path.join(this.projectRoot, 'tests', 'integration');
      if (await fileExists(integrationTestPath)) {
        const testResult = await RunCommand.execute('npm', ['run', 'test:integration'], {
          cwd: this.projectRoot,
          timeout: 180000,
        });

        const passed = this.parseTestOutput(testResult.stdout);
        result.tests.integration = {
          total: passed.total,
          passed: passed.passed,
          failed: passed.failed,
        };
      }
    } catch (error) {
      this.logger.warn('Integration tests not available');
    }
  }

  private async runE2ETest(result: TestResult): Promise<void> {
    this.logger.section('E2E Tests');

    try {
      const e2eTestPath = path.join(this.projectRoot, 'tests', 'e2e');
      if (await fileExists(e2eTestPath)) {
        const testResult = await RunCommand.execute('npm', ['run', 'test:e2e'], {
          cwd: this.projectRoot,
          timeout: 300000,
        });

        const passed = this.parseTestOutput(testResult.stdout);
        result.tests.e2e = {
          total: passed.total,
          passed: passed.passed,
          failed: passed.failed,
        };
      }
    } catch (error) {
      this.logger.warn('E2E tests not available');
    }
  }

  private parseTestOutput(output: string): {
    total: number;
    passed: number;
    failed: number;
    coverage?: string;
  } {
    const passedMatch = output.match(/(\d+)\s+passed/);
    const failedMatch = output.match(/(\d+)\s+failed/);
    const coverageMatch = output.match(/All files[|\s]+(\d+\.?\d*)/);

    const passed = passedMatch ? parseInt(passedMatch[1], 10) : 0;
    const failed = failedMatch ? parseInt(failedMatch[1], 10) : 0;
    const total = passed + failed;
    const coverage = coverageMatch ? `${coverageMatch[1]}%` : undefined;

    return { total, passed, failed, coverage };
  }

  async generateTestReport(result: TestResult): Promise<string> {
    const report = `
# Test Report

**Feature**: ${result.feature_id}
**Timestamp**: ${result.timestamp}

## Summary

| Test Type | Total | Passed | Failed | Coverage |
|-----------|-------|--------|--------|----------|
| Unit | ${result.tests.unit.total} | ${result.tests.unit.passed} | ${result.tests.unit.failed} | ${result.tests.unit.coverage || 'N/A'} |
| Integration | ${result.tests.integration.total} | ${result.tests.integration.passed} | ${result.tests.integration.failed} | N/A |
| E2E | ${result.tests.e2e.total} | ${result.tests.e2e.passed} | ${result.tests.e2e.failed} | N/A |

## Issues

${result.issues.map((issue) => `- **${issue.type}**: ${issue.message} (${issue.severity})`).join('\n') || 'No issues found'}
`;

    return report;
  }
}
