import { StateManager } from './StateManager';
import { Logger, RunCommand, fileExists, getProjectRoot, getProjectToolchain, ProjectToolchain } from '../utils';
import { TestResult, Feature } from '../types';
import * as path from 'path';

export class TestManager {
  private stateManager: StateManager;
  private logger: Logger;
  private projectRoot: string;
  private toolchain: ProjectToolchain | null = null;

  constructor(projectRoot: string = getProjectRoot()) {
    this.projectRoot = projectRoot;
    this.stateManager = new StateManager(projectRoot);
    this.logger = new Logger();
  }

  private async getToolchain(): Promise<ProjectToolchain> {
    if (!this.toolchain) {
      this.toolchain = await getProjectToolchain(this.projectRoot);
    }
    return this.toolchain;
  }

  async compile(): Promise<{ success: boolean; output: string }> {
    const tc = await this.getToolchain();

    if (tc.compileCommand.length === 0) {
      this.logger.info('No compile step needed for this project type');
      return { success: true, output: '' };
    }

    this.logger.section(`Compiling (${tc.language})`);
    this.logger.info(`Running: ${tc.compileCommand.join(' ')}`);

    try {
      const result = await RunCommand.execute(tc.compileCommand[0], tc.compileCommand.slice(1), {
        cwd: this.projectRoot,
        timeout: 180000,
      });
      this.logger.success('Compilation successful');
      return { success: true, output: result.stdout + result.stderr };
    } catch (error) {
      const rawMsg = error instanceof Error ? error.message : String(error);
      // Filter out noisy Xcode extension warnings, keep only meaningful errors
      const cleanLines = rawMsg.split('\n').filter((line: string) =>
        !line.includes('Requested but did not find extension point')
        && !line.includes('Xcode.IDEKit.ExtensionSentinelHostApplications')
        && !line.includes('Xcode.IDEKit.ExtensionPointIdentifierToBundleIdentifier')
      );
      const cleanMsg = cleanLines.join('\n').trim();
      this.logger.error(`Compilation failed`);
      return { success: false, output: cleanMsg };
    }
  }

  async runTests(feature?: Feature): Promise<TestResult> {
    const tc = await this.getToolchain();
    this.logger.info(`Running tests (${tc.language})...`);

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
      switch (tc.language) {
        case 'swift':
          await this.runSwiftTests(result);
          break;
        case 'c':
        case 'cpp':
          await this.runMakeTests(result);
          break;
        case 'node':
          await this.runNodeTests(result);
          break;
        case 'go':
          await this.runGoTests(result);
          break;
        case 'rust':
          await this.runRustTests(result);
          break;
        case 'python':
          await this.runPytest(result);
          break;
        default:
          this.logger.warn('Unknown project type, attempting generic test run');
          await this.runGenericTests(result);
          break;
      }

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

  private async runSwiftTests(result: TestResult): Promise<void> {
    this.logger.section('Swift Tests');

    try {
      const tc = await this.getToolchain();
      const testResult = await RunCommand.execute(tc.testCommand[0], tc.testCommand.slice(1), {
        cwd: this.projectRoot,
        timeout: 300000,
      });

      const parsed = this.parseSwiftTestOutput(testResult.stdout + testResult.stderr);
      result.tests.unit = parsed;

      if (parsed.failed > 0) {
        result.issues.push({
          type: 'test_failure',
          message: `${parsed.failed} Swift tests failed`,
          severity: 'high',
        });
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      result.issues.push({
        type: 'test_failure',
        message: `Swift tests failed: ${errMsg}`,
        severity: 'medium',
      });
    }
  }

  private parseSwiftTestOutput(output: string): { total: number; passed: number; failed: number } {
    const passedMatch = output.match(/Test Suite.*\s+(\d+) test[s]?.*passed/i)
      || output.match(/(\d+) passed/);
    const failedMatch = output.match(/(\d+) failed/);

    const passed = passedMatch ? parseInt(passedMatch[1], 10) : 0;
    const failed = failedMatch ? parseInt(failedMatch[1], 10) : 0;

    return { total: passed + failed, passed, failed };
  }

  private async runMakeTests(result: TestResult): Promise<void> {
    this.logger.section('Make Tests');

    try {
      const tc = await this.getToolchain();
      const testResult = await RunCommand.execute(tc.testCommand[0], tc.testCommand.slice(1), {
        cwd: this.projectRoot,
        timeout: 180000,
      });

      const parsed = this.parseGenericTestOutput(testResult.stdout + testResult.stderr);
      result.tests.unit = parsed;

      if (parsed.failed > 0) {
        result.issues.push({
          type: 'test_failure',
          message: `${parsed.failed} tests failed`,
          severity: 'high',
        });
      }
    } catch (error) {
      this.logger.warn('Make tests failed or not available');
    }
  }

  private async runNodeTests(result: TestResult): Promise<void> {
    // Unit tests
    this.logger.section('Unit Tests');

    try {
      const packageJsonPath = path.join(this.projectRoot, 'package.json');
      if (await fileExists(packageJsonPath)) {
        const testResult = await RunCommand.execute('npm', ['test'], {
          cwd: this.projectRoot,
          timeout: 120000,
        });

        const parsed = this.parseJestOutput(testResult.stdout + testResult.stderr);
        result.tests.unit = {
          total: parsed.total,
          passed: parsed.passed,
          failed: parsed.failed,
          coverage: parsed.coverage,
        };

        if (parsed.failed > 0) {
          result.issues.push({
            type: 'test_failure',
            message: `${parsed.failed} unit tests failed`,
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

    // Integration tests
    this.logger.section('Integration Tests');
    try {
      const integrationTestPath = path.join(this.projectRoot, 'tests', 'integration');
      if (await fileExists(integrationTestPath)) {
        const testResult = await RunCommand.execute('npm', ['run', 'test:integration'], {
          cwd: this.projectRoot,
          timeout: 180000,
        });

        const parsed = this.parseJestOutput(testResult.stdout);
        result.tests.integration = { total: parsed.total, passed: parsed.passed, failed: parsed.failed };
      }
    } catch {
      this.logger.warn('Integration tests not available');
    }

    // E2E tests
    this.logger.section('E2E Tests');
    try {
      const e2eTestPath = path.join(this.projectRoot, 'tests', 'e2e');
      if (await fileExists(e2eTestPath)) {
        const testResult = await RunCommand.execute('npm', ['run', 'test:e2e'], {
          cwd: this.projectRoot,
          timeout: 300000,
        });

        const parsed = this.parseJestOutput(testResult.stdout);
        result.tests.e2e = { total: parsed.total, passed: parsed.passed, failed: parsed.failed };
      }
    } catch {
      this.logger.warn('E2E tests not available');
    }
  }

  private async runGoTests(result: TestResult): Promise<void> {
    this.logger.section('Go Tests');

    try {
      const testResult = await RunCommand.execute('go', ['test', './...', '-v'], {
        cwd: this.projectRoot,
        timeout: 180000,
      });

      const parsed = this.parseGoTestOutput(testResult.stdout);
      result.tests.unit = parsed;

      if (parsed.failed > 0) {
        result.issues.push({
          type: 'test_failure',
          message: `${parsed.failed} Go tests failed`,
          severity: 'high',
        });
      }
    } catch (error) {
      this.logger.warn('Go tests failed');
    }
  }

  private async runRustTests(result: TestResult): Promise<void> {
    this.logger.section('Rust Tests');

    try {
      const testResult = await RunCommand.execute('cargo', ['test'], {
        cwd: this.projectRoot,
        timeout: 180000,
      });

      const parsed = this.parseGenericTestOutput(testResult.stdout + testResult.stderr);
      result.tests.unit = parsed;

      if (parsed.failed > 0) {
        result.issues.push({
          type: 'test_failure',
          message: `${parsed.failed} Rust tests failed`,
          severity: 'high',
        });
      }
    } catch (error) {
      this.logger.warn('Rust tests failed');
    }
  }

  private async runPytest(result: TestResult): Promise<void> {
    this.logger.section('Python Tests');

    try {
      const testResult = await RunCommand.execute('pytest', [], {
        cwd: this.projectRoot,
        timeout: 180000,
      });

      const parsed = this.parseGenericTestOutput(testResult.stdout);
      result.tests.unit = parsed;

      if (parsed.failed > 0) {
        result.issues.push({
          type: 'test_failure',
          message: `${parsed.failed} Python tests failed`,
          severity: 'high',
        });
      }
    } catch (error) {
      this.logger.warn('Python tests failed');
    }
  }

  private async runGenericTests(result: TestResult): Promise<void> {
    const tc = await this.getToolchain();
    if (tc.testCommand.length === 0) {
      this.logger.warn('No test command configured for this project type');
      return;
    }

    try {
      const testResult = await RunCommand.execute(tc.testCommand[0], tc.testCommand.slice(1), {
        cwd: this.projectRoot,
        timeout: 180000,
      });

      const parsed = this.parseGenericTestOutput(testResult.stdout + testResult.stderr);
      result.tests.unit = parsed;
    } catch (error) {
      this.logger.warn('Tests failed');
    }
  }

  private parseJestOutput(output: string): { total: number; passed: number; failed: number; coverage?: string } {
    const passedMatch = output.match(/Tests:\s+(\d+)\s+passed/);
    const failedMatch = output.match(/(\d+)\s+failed/);
    const totalMatch = output.match(/Tests:\s+(\d+)\s+total/);
    const coverageMatch = output.match(/All files[^|]*\|\s*([\d.]+)\s*\|/);

    const passed = passedMatch ? parseInt(passedMatch[1], 10) : 0;
    const failed = failedMatch ? parseInt(failedMatch[1], 10) : 0;
    const total = totalMatch ? parseInt(totalMatch[1], 10) : passed + failed;
    const coverage = coverageMatch ? `${coverageMatch[1]}%` : undefined;

    return { total, passed, failed, coverage };
  }

  private parseGoTestOutput(output: string): { total: number; passed: number; failed: number } {
    const passed = (output.match(/--- PASS/g) || []).length;
    const failed = (output.match(/--- FAIL/g) || []).length;
    return { total: passed + failed, passed, failed };
  }

  private parseGenericTestOutput(output: string): { total: number; passed: number; failed: number } {
    const passedMatch = output.match(/(\d+)\s+passed/i);
    const failedMatch = output.match(/(\d+)\s+failed/i);
    const okMatch = output.match(/(\d+)\s*ok/i);

    const passed = passedMatch ? parseInt(passedMatch[1], 10) : (okMatch ? parseInt(okMatch[1], 10) : 0);
    const failed = failedMatch ? parseInt(failedMatch[1], 10) : 0;
    return { total: passed + failed, passed, failed };
  }

  async generateTestReport(result: TestResult): Promise<string> {
    const lines: string[] = [
      '# Test Report',
      '',
      `**Generated:** ${result.timestamp}`,
      `**Feature:** ${result.feature_id}`,
      '',
      '## Unit Tests',
      `- Total: ${result.tests.unit.total}`,
      `- Passed: ${result.tests.unit.passed}`,
      `- Failed: ${result.tests.unit.failed}`,
    ];

    if (result.tests.unit.coverage) {
      lines.push(`- Coverage: ${result.tests.unit.coverage}`);
    }

    lines.push(
      '',
      '## Integration Tests',
      `- Total: ${result.tests.integration.total}`,
      `- Passed: ${result.tests.integration.passed}`,
      `- Failed: ${result.tests.integration.failed}`,
      '',
      '## E2E Tests',
      `- Total: ${result.tests.e2e.total}`,
      `- Passed: ${result.tests.e2e.passed}`,
      `- Failed: ${result.tests.e2e.failed}`,
    );

    if (result.issues.length > 0) {
      lines.push('', '## Issues');
      for (const issue of result.issues) {
        lines.push(`- **[${issue.severity}]** ${issue.type}: ${issue.message}`);
      }
    }

    return lines.join('\n');
  }
}
