import { z } from 'zod';

export const FeatureSchema = z.object({
  id: z.string(),
  category: z.enum(['functional', 'non-functional', 'bugfix', 'refactor']),
  description: z.string(),
  priority: z.enum(['high', 'medium', 'low']),
  steps: z.array(z.string()),
  status: z.enum(['pending', 'in_progress', 'completed', 'blocked']),
  assigned_to: z.string().optional(),
  completed_at: z.string().optional(),
  test_cases: z.array(
    z.object({
      description: z.string(),
      expected_result: z.string(),
      actual_result: z.string().optional(),
      passed: z.boolean().optional(),
    })
  ),
  dependencies: z.array(z.string()).optional(),
});

export const FeatureListSchema = z.object({
  project_name: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  features: z.array(FeatureSchema),
  parallel_groups: z
    .array(
      z.object({
        group_id: z.string(),
        features: z.array(z.string()),
        description: z.string(),
        dependencies: z.array(z.string()),
      })
    )
    .optional(),
  dependencies: z
    .array(
      z.object({
        from: z.string(),
        to: z.string(),
        type: z.enum(['requires', 'blocks', 'relates']),
      })
    )
    .optional(),
});

export const ProgressSchema = z.object({
  session_id: z.string(),
  started_at: z.string(),
  current_task: z.string().optional(),
  completed_work: z.array(z.string()),
  issues: z.array(
    z.object({
      description: z.string(),
      solution: z.string().optional(),
      severity: z.enum(['low', 'medium', 'high', 'critical']),
    })
  ),
  next_steps: z.array(z.string()),
  git_commits: z.array(z.string()),
});

export const AgentStateSchema = z.object({
  version: z.string(),
  last_run: z.string(),
  total_sessions: z.number(),
  current_session: z.string().optional(),
  statistics: z.object({
    total_features: z.number(),
    completed_features: z.number(),
    failed_features: z.number(),
    total_tests: z.number(),
    passed_tests: z.number(),
    failed_tests: z.number(),
  }),
});

export const TestResultSchema = z.object({
  timestamp: z.string(),
  feature_id: z.string(),
  tests: z.object({
    unit: z.object({
      total: z.number(),
      passed: z.number(),
      failed: z.number(),
      coverage: z.string().optional(),
    }),
    integration: z.object({
      total: z.number(),
      passed: z.number(),
      failed: z.number(),
    }),
    e2e: z.object({
      total: z.number(),
      passed: z.number(),
      failed: z.number(),
    }),
  }),
  issues: z.array(
    z.object({
      type: z.enum(['test_failure', 'compilation_error', 'runtime_error']),
      message: z.string(),
      severity: z.enum(['low', 'medium', 'high', 'critical']),
      stack_trace: z.string().optional(),
    })
  ),
});
