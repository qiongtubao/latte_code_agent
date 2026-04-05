import { FeatureManager } from '../core/FeatureManager';
import { getProjectRoot } from '../utils';

describe('FeatureManager', () => {
  let featureManager: FeatureManager;

  beforeEach(() => {
    const projectRoot = getProjectRoot();
    featureManager = new FeatureManager(projectRoot);
  });

  describe('parseLATTEMd', () => {
    it('should throw error if LATTE.md not found', async () => {
      await expect(featureManager.parseLATTEMd()).rejects.toThrow('LATTE.md file not found');
    });
  });

  describe('createFeatureList', () => {
    it('should create feature list from LATTE.md', async () => {
      const featureList = await featureManager.createFeatureList('test-project');

      expect(featureList).toBeDefined();
      expect(featureList.project_name).toBe('test-project');
      expect(featureList.features).toBeDefined();
      expect(Array.isArray(featureList.features)).toBe(true);
    });
  });
});
