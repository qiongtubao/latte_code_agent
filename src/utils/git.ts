import * as simpleGit from 'simple-git';
import { getProjectRoot } from './fileSystem';

export interface GitCommitOptions {
  message: string;
  files?: string[];
}

export class GitManager {
  private git: simpleGit.SimpleGit;

  constructor(projectRoot: string = getProjectRoot()) {
    this.git = simpleGit.simpleGit(projectRoot);
  }

  async isRepo(): Promise<boolean> {
    return this.git.checkIsRepo();
  }

  async init(): Promise<void> {
    const isRepo = await this.isRepo();
    if (!isRepo) {
      await this.git.init();
    }
  }

  async add(files?: string[]): Promise<void> {
    if (files && files.length > 0) {
      await this.git.add(files);
    } else {
      await this.git.add('.');
    }
  }

  async commit(message: string): Promise<string> {
    const result = await this.git.commit(message);
    return result.commit;
  }

  async status(): Promise<simpleGit.StatusResult> {
    return this.git.status();
  }

  async log(maxCount: number = 20): Promise<simpleGit.DefaultLogFields[]> {
    const result = await this.git.log(['--oneline', `-n ${maxCount}`]);
    return result.all as simpleGit.DefaultLogFields[];
  }

  async diff(): Promise<string> {
    return this.git.diff();
  }

  async hasChanges(): Promise<boolean> {
    const status = await this.status();
    return status.files.length > 0;
  }

  async createBranch(branchName: string): Promise<void> {
    await this.git.checkoutLocalBranch(branchName);
  }

  async checkout(branchName: string): Promise<void> {
    await this.git.checkout(branchName);
  }

  async getCurrentBranch(): Promise<string> {
    const status = await this.status();
    return status.current || 'main';
  }
}
