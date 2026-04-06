export interface Feature {
  id: string;
  category: 'functional' | 'non-functional' | 'bugfix' | 'refactor';
  description: string;
  priority: 'high' | 'medium' | 'low';
  steps: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  assigned_to?: string;
  completed_at?: string;
  test_cases: TestCase[];
  dependencies?: string[];
  blocked_reason?: string;
}

export interface TestCase {
  description: string;
  expected_result: string;
  actual_result?: string;
  passed?: boolean;
}

export interface FeatureList {
  project_name: string;
  created_at: string;
  updated_at: string;
  features: Feature[];
  parallel_groups?: ParallelGroup[];
  dependencies?: Dependency[];
}

export interface ParallelGroup {
  group_id: string;
  features: string[];
  description: string;
  dependencies: string[];
}

export interface Dependency {
  from: string;
  to: string;
  type: 'requires' | 'blocks' | 'relates';
}

export interface Progress {
  session_id: string;
  started_at: string;
  current_task?: string;
  completed_work: string[];
  issues: Issue[];
  next_steps: string[];
  git_commits: string[];
}

export interface Issue {
  description: string;
  solution?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface AgentState {
  version: string;
  last_run: string;
  total_sessions: number;
  current_session?: string;
  statistics: Statistics;
}

export interface Statistics {
  total_features: number;
  completed_features: number;
  failed_features: number;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
}

export type AgentType = 'initializer' | 'coding';

export interface AgentConfig {
  type: AgentType;
  model: 'latte' | 'claude' | 'trae';
  modelName?: string;
  max_retries: number;
  timeout: number;
}

export interface TestResult {
  timestamp: string;
  feature_id: string;
  tests: {
    unit: TestSuite;
    integration: TestSuite;
    e2e: TestSuite;
  };
  issues: TestIssue[];
}

export interface TestSuite {
  total: number;
  passed: number;
  failed: number;
  coverage?: string;
}

export interface TestIssue {
  type: 'test_failure' | 'compilation_error' | 'runtime_error';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  stack_trace?: string;
}
