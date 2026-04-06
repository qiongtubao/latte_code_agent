import { spawn } from 'child_process';

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
    const timeout = options.timeout || 300000;

    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: options.cwd || process.cwd(),
        env: { ...process.env, ...options.env },
        shell: false,
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      const timer = setTimeout(() => {
        child.kill();
        reject(new Error(`Command timeout after ${timeout}ms`));
      }, timeout);

      child.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          const fullCommand = `${command} ${args.join(' ')}`;
          reject(new Error(`Command failed with code ${code}: ${fullCommand}\n${stderr}`));
        }
      });

      child.on('error', (error) => {
        clearTimeout(timer);
        const fullCommand = `${command} ${args.join(' ')}`;
        reject(new Error(`Command failed: ${fullCommand}\n${error.message}`));
      });
    });
  }
}
