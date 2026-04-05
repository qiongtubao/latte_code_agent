import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface CommandResult {
  stdout: string;
  stderr: string;
}

export interface CommandOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeout?: number;
}

export class RunCommand {
  static async execute(
    command: string,
    args: string[] = [],
    options: CommandOptions = {}
  ): Promise<CommandResult> {
    const fullCommand = `${command} ${args.join(' ')}`;
    const timeout = options.timeout || 300000;

    try {
      const result = await execAsync(fullCommand, {
        cwd: options.cwd || process.cwd(),
        env: { ...process.env, ...options.env },
        timeout,
        maxBuffer: 1024 * 1024 * 10,
      });

      return {
        stdout: result.stdout,
        stderr: result.stderr,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Command failed: ${fullCommand}\n${error.message}`);
      }
      throw error;
    }
  }
}
