import { StateManager } from '../core/StateManager';
import { getProjectRoot } from '../utils';

describe('StateManager', () => {
  let stateManager: StateManager;

  beforeEach(() => {
    const projectRoot = getProjectRoot();
    stateManager = new StateManager(projectRoot);
  });

  describe('createInitialFeatureList', () => {
    it('should create a feature list with correct structure', async () => {
      const featureList = await stateManager.createInitialFeatureList('test-project');

      expect(featureList).toBeDefined();
      expect(featureList.project_name).toBe('test-project');
      expect(featureList.created_at).toBeDefined();
      expect(featureList.updated_at).toBeDefined();
      expect(featureList.features).toEqual([]);
    });
  });

  describe('createInitialProgress', () => {
    it('should create progress with correct structure', async () => {
      const progress = await stateManager.createInitialProgress();

      expect(progress).toBeDefined();
      expect(progress.session_id).toBeDefined();
      expect(progress.started_at).toBeDefined();
      expect(progress.completed_work).toEqual([]);
      expect(progress.issues).toEqual([]);
      expect(progress.next_steps).toEqual([]);
      expect(progress.git_commits).toEqual([]);
    });
  });

  describe('createInitialState', () => {
    it('should create state with correct structure', async () => {
      const state = await stateManager.createInitialState();

      expect(state).toBeDefined();
      expect(state.version).toBe('0.1.0');
      expect(state.last_run).toBeDefined();
      expect(state.total_sessions).toBe(0);
      expect(state.statistics).toBeDefined();
    });
  });
});
