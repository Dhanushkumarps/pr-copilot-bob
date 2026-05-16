/**
 * Git file status types
 */
export type GitFileStatus =
  | 'added'
  | 'modified'
  | 'deleted'
  | 'renamed'
  | 'copied'
  | 'untracked';

/**
 * Type of change in a diff
 */
export type ChangeType = 'addition' | 'deletion' | 'context';

/**
 * Represents a single line change in a diff
 */
export interface DiffChange {
  /** Line number in the file (after changes) */
  lineNumber: number;
  /** Type of change */
  type: ChangeType;
  /** Content of the line */
  content: string;
  /** Original line number (for deletions/modifications) */
  oldLineNumber?: number;
}

/**
 * Represents a hunk (section) of changes in a diff
 */
export interface DiffHunk {
  /** Starting line in old file */
  oldStart: number;
  /** Number of lines in old file */
  oldLines: number;
  /** Starting line in new file */
  newStart: number;
  /** Number of lines in new file */
  newLines: number;
  /** Header line (e.g., @@ -1,5 +1,7 @@) */
  header: string;
  /** Individual changes in this hunk */
  changes: DiffChange[];
}

/**
 * Represents changes to a single file
 */
export interface FileDiff {
  /** File path relative to repository root */
  path: string;
  /** Previous file path (for renames) */
  oldPath?: string;
  /** File status */
  status: GitFileStatus;
  /** Number of lines added */
  additions: number;
  /** Number of lines deleted */
  deletions: number;
  /** Whether this is a binary file */
  binary: boolean;
  /** Hunks of changes */
  hunks: DiffHunk[];
  /** Programming language detected from file extension */
  language?: string;
}

/**
 * Complete git diff analysis result
 */
export interface GitDiffResult {
  /** List of changed files */
  files: FileDiff[];
  /** Total number of files changed */
  totalFiles: number;
  /** Total lines added across all files */
  totalAdditions: number;
  /** Total lines deleted across all files */
  totalDeletions: number;
  /** Branch being compared against (if specified) */
  baseBranch?: string;
  /** Commit hash of base (if available) */
  baseCommit?: string;
  /** Commit hash of head (if available) */
  headCommit?: string;
  /** Whether there are uncommitted changes */
  hasUncommittedChanges: boolean;
}

/**
 * Git repository information
 */
export interface GitRepoInfo {
  /** Repository root directory */
  rootDir: string;
  /** Current branch name */
  currentBranch: string;
  /** Remote URL (if available) */
  remoteUrl?: string;
  /** Whether the working directory is clean */
  isClean: boolean;
  /** List of untracked files */
  untrackedFiles: string[];
}

/**
 * Git command execution options
 */
export interface GitCommandOptions {
  /** Working directory for git command */
  cwd?: string;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Environment variables */
  env?: Record<string, string>;
}

/**
 * Git command execution result
 */
export interface GitCommandResult {
  /** Standard output */
  stdout: string;
  /** Standard error */
  stderr: string;
  /** Exit code */
  exitCode: number;
  /** Command that was executed */
  command: string;
}

/**
 * Options for git diff analysis
 */
export interface DiffAnalysisOptions {
  /** Branch to compare against (default: current branch vs working directory) */
  baseBranch?: string;
  /** Include untracked files */
  includeUntracked?: boolean;
  /** Include staged changes only */
  stagedOnly?: boolean;
  /** Maximum number of lines to analyze per file */
  maxLinesPerFile?: number;
  /** File patterns to include (glob patterns) */
  includePatterns?: string[];
  /** File patterns to exclude (glob patterns) */
  excludePatterns?: string[];
}

/**
 * File metadata extracted from diff
 */
export interface FileMetadata {
  /** File path */
  path: string;
  /** File extension */
  extension: string;
  /** Programming language */
  language?: string;
  /** Whether file is in a critical directory (e.g., src/, lib/) */
  isCritical: boolean;
  /** Whether file is a test file */
  isTest: boolean;
  /** Whether file is a configuration file */
  isConfig: boolean;
  /** File size in bytes (if available) */
  size?: number;
}

/**
 * Code complexity metrics for a file
 */
export interface ComplexityMetrics {
  /** File path */
  path: string;
  /** Cyclomatic complexity (estimated) */
  cyclomaticComplexity: number;
  /** Number of functions/methods */
  functionCount: number;
  /** Number of classes */
  classCount: number;
  /** Lines of code (excluding comments and blank lines) */
  linesOfCode: number;
  /** Comment density (0-1) */
  commentDensity: number;
  /** Nesting depth (maximum) */
  maxNestingDepth: number;
}

/**
 * Summary of changes by category
 */
export interface ChangeSummary {
  /** Files added */
  added: string[];
  /** Files modified */
  modified: string[];
  /** Files deleted */
  deleted: string[];
  /** Files renamed */
  renamed: Array<{ from: string; to: string }>;
  /** Critical files changed */
  criticalFiles: string[];
  /** Test files changed */
  testFiles: string[];
  /** Configuration files changed */
  configFiles: string[];
}

/**
 * Language-specific file extensions mapping
 */
export const LANGUAGE_EXTENSIONS: Record<string, string[]> = {
  typescript: ['.ts', '.tsx'],
  javascript: ['.js', '.jsx', '.mjs', '.cjs'],
  python: ['.py', '.pyw'],
  java: ['.java'],
  csharp: ['.cs'],
  go: ['.go'],
  rust: ['.rs'],
  ruby: ['.rb'],
  php: ['.php'],
  swift: ['.swift'],
  kotlin: ['.kt', '.kts'],
  scala: ['.scala'],
  cpp: ['.cpp', '.cc', '.cxx', '.hpp', '.h'],
  c: ['.c', '.h'],
  shell: ['.sh', '.bash', '.zsh'],
  yaml: ['.yml', '.yaml'],
  json: ['.json'],
  xml: ['.xml'],
  html: ['.html', '.htm'],
  css: ['.css', '.scss', '.sass', '.less'],
  sql: ['.sql'],
  markdown: ['.md', '.markdown'],
};

/**
 * Critical file patterns (regex)
 */
export const CRITICAL_FILE_PATTERNS = [
  /^src\//,
  /^lib\//,
  /^app\//,
  /^core\//,
  /^api\//,
  /^server\//,
  /^backend\//,
  /^frontend\//,
  /package\.json$/,
  /tsconfig\.json$/,
  /\.env$/,
  /docker-compose\.yml$/,
  /Dockerfile$/,
];

/**
 * Test file patterns (regex)
 */
export const TEST_FILE_PATTERNS = [
  /\.test\./,
  /\.spec\./,
  /__tests__\//,
  /^tests?\//,
  /^test\//,
  /\.test$/,
  /\.spec$/,
];

/**
 * Configuration file patterns (regex)
 */
export const CONFIG_FILE_PATTERNS = [
  /\.config\./,
  /\.rc$/,
  /^\..*rc$/,
  /package\.json$/,
  /tsconfig\.json$/,
  /\.env/,
  /\.yml$/,
  /\.yaml$/,
  /\.toml$/,
  /\.ini$/,
];

// Made with Bob
