/**
 * IBM watsonx.ai request parameters
 */
export interface GraniteRequestParams {
  /** Model ID to use */
  model_id: string;
  /** Input prompt */
  input: string;
  /** Generation parameters */
  parameters: {
    /** Maximum number of tokens to generate */
    max_new_tokens: number;
    /** Temperature for sampling (0.0-1.0) */
    temperature: number;
    /** Top P for nucleus sampling (0.0-1.0) */
    top_p: number;
    /** Top K for sampling */
    top_k?: number;
    /** Repetition penalty */
    repetition_penalty?: number;
    /** Stop sequences */
    stop_sequences?: string[];
  };
  /** Project ID */
  project_id: string;
}

/**
 * IBM watsonx.ai response
 */
export interface GraniteResponse {
  /** Model ID used */
  model_id: string;
  /** Generated text */
  results: Array<{
    /** Generated text */
    generated_text: string;
    /** Number of tokens generated */
    generated_token_count: number;
    /** Input token count */
    input_token_count: number;
    /** Stop reason */
    stop_reason: string;
  }>;
  /** Creation timestamp */
  created_at: string;
}

/**
 * AI generation options
 */
export interface AIGenerationOptions {
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Temperature (0.0-1.0) */
  temperature?: number;
  /** Top P (0.0-1.0) */
  topP?: number;
  /** Timeout in milliseconds */
  timeoutMs?: number;
  /** Number of retries on failure */
  maxRetries?: number;
  /** Retry delay in milliseconds */
  retryDelayMs?: number;
}

/**
 * AI generation result
 */
export interface AIGenerationResult {
  /** Generated text */
  text: string;
  /** Tokens used */
  tokensUsed: {
    input: number;
    output: number;
    total: number;
  };
  /** Generation duration in milliseconds */
  durationMs: number;
  /** Model used */
  model: string;
  /** Whether result was from cache */
  cached?: boolean;
}

/**
 * PR title generation prompt context
 */
export interface PRTitleContext {
  /** Changed files summary */
  files: string[];
  /** Total additions */
  additions: number;
  /** Total deletions */
  deletions: number;
  /** Main changes description */
  mainChanges: string;
  /** Programming languages involved */
  languages: string[];
}

/**
 * PR description generation prompt context
 */
export interface PRDescriptionContext {
  /** Changed files with details */
  files: Array<{
    path: string;
    status: string;
    additions: number;
    deletions: number;
  }>;
  /** Code snippets showing key changes */
  keyChanges: Array<{
    file: string;
    change: string;
  }>;
  /** Detected patterns (e.g., "added authentication", "refactored API") */
  patterns: string[];
  /** Security findings (if any) */
  securityIssues?: string[];
}

/**
 * Test suggestion generation prompt context
 */
export interface TestSuggestionContext {
  /** File being tested */
  file: string;
  /** Programming language */
  language: string;
  /** Functions/methods added or modified */
  functions: string[];
  /** Code snippets of changes */
  codeSnippets: string[];
  /** Existing test patterns (if detected) */
  existingTestPatterns?: string[];
}

/**
 * Generated PR title
 */
export interface GeneratedPRTitle {
  /** The title text */
  title: string;
  /** Conventional commit type (feat, fix, etc.) */
  type?: string;
  /** Scope (optional) */
  scope?: string;
  /** Whether title follows conventional commits */
  isConventional: boolean;
  /** Character count */
  length: number;
}

/**
 * Generated PR description
 */
export interface GeneratedPRDescription {
  /** What changed section */
  whatChanged: string;
  /** Why it changed section */
  whyChanged: string;
  /** Impact analysis section */
  impact: string;
  /** Breaking changes (if any) */
  breakingChanges?: string[];
  /** Related issues/tickets */
  relatedIssues?: string[];
}

/**
 * Test suggestion
 */
export interface TestSuggestion {
  /** Type of test */
  type: 'unit' | 'integration' | 'e2e';
  /** Test description */
  description: string;
  /** Test scenario */
  scenario: string;
  /** Code snippet (if enabled) */
  codeSnippet?: string;
  /** Test framework (jest, mocha, pytest, etc.) */
  framework?: string;
  /** Priority (1-5, 5 being highest) */
  priority: number;
}

/**
 * Generated test suggestions
 */
export interface GeneratedTestSuggestions {
  /** Unit tests */
  unitTests: TestSuggestion[];
  /** Integration tests */
  integrationTests: TestSuggestion[];
  /** E2E tests */
  e2eTests: TestSuggestion[];
  /** Total suggestions */
  totalSuggestions: number;
  /** Estimated coverage improvement */
  estimatedCoverageImprovement?: number;
}

/**
 * AI prompt template
 */
export interface PromptTemplate {
  /** Template name */
  name: string;
  /** System prompt */
  system?: string;
  /** User prompt template with placeholders */
  template: string;
  /** Example output (for few-shot learning) */
  examples?: Array<{
    input: string;
    output: string;
  }>;
  /** Default parameters */
  defaultParams?: Partial<AIGenerationOptions>;
}

/**
 * AI cache entry
 */
export interface AICacheEntry {
  /** Cache key (hash of prompt) */
  key: string;
  /** Cached response */
  response: AIGenerationResult;
  /** Timestamp when cached */
  timestamp: number;
  /** TTL in milliseconds */
  ttl: number;
}

/**
 * AI client configuration
 */
export interface AIClientConfig {
  /** IBM Cloud API key */
  apiKey: string;
  /** watsonx.ai project ID */
  projectId: string;
  /** API endpoint URL */
  url: string;
  /** Default model ID */
  modelId: string;
  /** Default generation options */
  defaultOptions: AIGenerationOptions;
  /** Enable response caching */
  enableCache?: boolean;
  /** Cache TTL in milliseconds */
  cacheTTL?: number;
}

/**
 * AI generation metrics
 */
export interface AIMetrics {
  /** Total requests made */
  totalRequests: number;
  /** Successful requests */
  successfulRequests: number;
  /** Failed requests */
  failedRequests: number;
  /** Total tokens used */
  totalTokens: number;
  /** Average response time in ms */
  averageResponseTime: number;
  /** Cache hit rate (0-1) */
  cacheHitRate: number;
  /** Total cost (if applicable) */
  totalCost?: number;
}

/**
 * Conventional commit types
 */
export const CONVENTIONAL_COMMIT_TYPES = [
  'feat',     // New feature
  'fix',      // Bug fix
  'docs',     // Documentation changes
  'style',    // Code style changes (formatting, etc.)
  'refactor', // Code refactoring
  'perf',     // Performance improvements
  'test',     // Adding or updating tests
  'build',    // Build system changes
  'ci',       // CI/CD changes
  'chore',    // Other changes (maintenance, etc.)
  'revert',   // Revert previous commit
] as const;

export type ConventionalCommitType = typeof CONVENTIONAL_COMMIT_TYPES[number];

/**
 * Test frameworks by language
 */
export const TEST_FRAMEWORKS: Record<string, string[]> = {
  typescript: ['jest', 'mocha', 'vitest', 'ava'],
  javascript: ['jest', 'mocha', 'jasmine', 'vitest'],
  python: ['pytest', 'unittest', 'nose2'],
  java: ['junit', 'testng', 'mockito'],
  csharp: ['nunit', 'xunit', 'mstest'],
  go: ['testing', 'testify'],
  rust: ['cargo test'],
  ruby: ['rspec', 'minitest'],
  php: ['phpunit', 'pest'],
};

/**
 * Stop sequences for different output types
 */
export const STOP_SEQUENCES = {
  title: ['\n', '##', '---'],
  description: ['---', '###'],
  tests: ['---', '```\n\n'],
};

// Made with Bob
