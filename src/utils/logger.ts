import chalk from 'chalk';
import ora from 'ora';

export class Logger {
  private spinner: ora.Ora | null = null;

  info(message: string): void {
    console.log(chalk.blue('ℹ'), message);
  }

  success(message: string): void {
    console.log(chalk.green('✓'), message);
  }

  warn(message: string): void {
    console.log(chalk.yellow('⚠'), message);
  }

  error(message: string): void {
    console.log(chalk.red('✗'), message);
  }

  debug(message: string): void {
    if (process.env.DEBUG) {
      console.log(chalk.gray('🔍'), message);
    }
  }

  startSpinner(message: string): void {
    this.spinner = ora(message).start();
  }

  updateSpinner(message: string): void {
    if (this.spinner) {
      this.spinner.text = message;
    }
  }

  stopSpinner(success: boolean = true): void {
    if (this.spinner) {
      if (success) {
        this.spinner.succeed();
      } else {
        this.spinner.fail();
      }
      this.spinner = null;
    }
  }

  title(message: string): void {
    console.log();
    console.log(chalk.bold.cyan(`━━━ ${message} ━━━`));
    console.log();
  }

  section(message: string): void {
    console.log();
    console.log(chalk.cyan(`▶ ${message}`));
  }

  list(items: string[]): void {
    items.forEach((item, index) => {
      console.log(chalk.gray(`  ${index + 1}.`), item);
    });
  }
}

export const logger = new Logger();
