import { GitManager } from '../utils/git';
import { getProjectRoot } from '../utils';

describe('GitManager', () => {
  let gitManager: GitManager;

  beforeEach(() => {
    const projectRoot = getProjectRoot();
    gitManager = new GitManager(projectRoot);
  });

  describe('isRepo', () => {
    it('should check if current directory is a git repository', async () => {
      const isRepo = await gitManager.isRepo();
      expect(typeof isRepo).toBe('boolean');
    });
  });

  describe('status', () => {
    it('should return git status', async () => {
      const status = await gitManager.status();
      expect(status).toBeDefined();
    });
  });

  describe('log', () => {
    it('should return git log', async () => {
      const logs = await gitManager.log(5);
      expect(Array.isArray(logs)).toBe(true);
    });
  });
});
