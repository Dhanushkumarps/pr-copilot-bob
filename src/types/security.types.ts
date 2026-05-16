/**
 * Security finding severity levels
 */
export type SecuritySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * Types of security issues that can be detected
 */
export type SecurityIssueType =
  | 'API_KEY'
  | 'PASSWORD'
  | 'PRIVATE_KEY'
  | 'SECRET_TOKEN'
  | 'DATABASE_URL'
  | 'AWS_KEY'
  | 'GITHUB_TOKEN'
  | 'GOOGLE_API_KEY'
  | 'SLACK_TOKEN'
  | 'JWT_SECRET'
  | 'ENCRYPTION_KEY'
  | 'CERTIFICATE'
  | 'EMAIL_IN_CODE'
  | 'IP_ADDRESS'
  | 'HARDCODED_CREDENTIAL';

/**
 * A single security finding
 */
export interface SecurityFinding {
  /** Type of security issue */
  type: SecurityIssueType;
  /** Severity level */
  severity: SecuritySeverity;
  /** File path where issue was found */
  file: string;
  /** Line number in the file */
  line: number;
  /** Column number (if available) */
  column?: number;
  /** The actual content that triggered the finding */
  content: string;
  /** Pattern that matched (for debugging) */
  pattern?: string;
  /** Description of the issue */
  description: string;
  /** Recommendation for fixing the issue */
  recommendation: string;
  /** Confidence level (0-1) */
  confidence: number;
  /** Context lines around the finding */
  context?: {
    before: string[];
    after: string[];
  };
}

/**
 * Security scan result for all files
 */
export interface SecurityScanResult {
  /** All findings */
  findings: SecurityFinding[];
  /** Total number of findings */
  totalFindings: number;
  /** Findings by severity */
  bySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  /** Findings by type */
  byType: Record<SecurityIssueType, number>;
  /** Files scanned */
  filesScanned: number;
  /** Whether any critical issues were found */
  hasCriticalIssues: boolean;
  /** Scan duration in milliseconds */
  scanDurationMs: number;
}

/**
 * Security pattern definition
 */
export interface SecurityPattern {
  /** Pattern type */
  type: SecurityIssueType;
  /** Regular expression to match */
  regex: RegExp;
  /** Severity if matched */
  severity: SecuritySeverity;
  /** Description template */
  description: string;
  /** Recommendation template */
  recommendation: string;
  /** Confidence level (0-1) */
  confidence: number;
  /** Whether to check in comments */
  checkInComments?: boolean;
  /** Whether to check in strings */
  checkInStrings?: boolean;
  /** File patterns to include (if specified, only check these files) */
  includeFiles?: RegExp[];
  /** File patterns to exclude */
  excludeFiles?: RegExp[];
}

/**
 * Security scan options
 */
export interface SecurityScanOptions {
  /** Minimum severity to report */
  minSeverity?: SecuritySeverity;
  /** Maximum findings to return (0 = unlimited) */
  maxFindings?: number;
  /** Include context lines */
  includeContext?: boolean;
  /** Number of context lines before/after */
  contextLines?: number;
  /** Custom patterns to add */
  customPatterns?: SecurityPattern[];
  /** Pattern types to exclude */
  excludeTypes?: SecurityIssueType[];
  /** File patterns to exclude */
  excludeFiles?: RegExp[];
}

/**
 * Security finding with file context
 */
export interface SecurityFindingWithContext extends SecurityFinding {
  /** Full file content */
  fileContent: string;
  /** Language of the file */
  language?: string;
  /** Whether the finding is in a comment */
  inComment: boolean;
  /** Whether the finding is in a string literal */
  inString: boolean;
}

/**
 * Security scan statistics
 */
export interface SecurityScanStats {
  /** Total lines scanned */
  linesScanned: number;
  /** Total files scanned */
  filesScanned: number;
  /** Patterns checked */
  patternsChecked: number;
  /** Matches found (before filtering) */
  totalMatches: number;
  /** False positives filtered */
  falsePositivesFiltered: number;
  /** Scan duration in milliseconds */
  durationMs: number;
}

/**
 * Severity level priority for comparison
 */
export const SEVERITY_PRIORITY: Record<SecuritySeverity, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

/**
 * Default recommendations by issue type
 */
export const DEFAULT_RECOMMENDATIONS: Record<SecurityIssueType, string> = {
  API_KEY: 'Move API keys to environment variables and use a secrets manager',
  PASSWORD: 'Never hardcode passwords. Use environment variables or a secrets manager',
  PRIVATE_KEY: 'Store private keys securely using a key management service',
  SECRET_TOKEN: 'Move tokens to environment variables and rotate them regularly',
  DATABASE_URL: 'Use environment variables for database connection strings',
  AWS_KEY: 'Use AWS IAM roles or store credentials in AWS Secrets Manager',
  GITHUB_TOKEN: 'Use GitHub Actions secrets or environment variables',
  GOOGLE_API_KEY: 'Store API keys in Google Cloud Secret Manager',
  SLACK_TOKEN: 'Use environment variables and rotate tokens regularly',
  JWT_SECRET: 'Generate strong secrets and store in environment variables',
  ENCRYPTION_KEY: 'Use a key management service and rotate keys regularly',
  CERTIFICATE: 'Store certificates securely and use certificate management tools',
  EMAIL_IN_CODE: 'Avoid hardcoding email addresses. Use configuration files',
  IP_ADDRESS: 'Use configuration files or service discovery for IP addresses',
  HARDCODED_CREDENTIAL: 'Remove hardcoded credentials and use secure storage',
};

/**
 * Issue type descriptions
 */
export const ISSUE_TYPE_DESCRIPTIONS: Record<SecurityIssueType, string> = {
  API_KEY: 'Potential API key detected',
  PASSWORD: 'Potential hardcoded password detected',
  PRIVATE_KEY: 'Private key or certificate detected',
  SECRET_TOKEN: 'Secret token or authentication key detected',
  DATABASE_URL: 'Database connection string detected',
  AWS_KEY: 'AWS access key or secret detected',
  GITHUB_TOKEN: 'GitHub personal access token detected',
  GOOGLE_API_KEY: 'Google API key detected',
  SLACK_TOKEN: 'Slack API token detected',
  JWT_SECRET: 'JWT secret key detected',
  ENCRYPTION_KEY: 'Encryption key detected',
  CERTIFICATE: 'Certificate or key file detected',
  EMAIL_IN_CODE: 'Email address hardcoded in source',
  IP_ADDRESS: 'IP address hardcoded in source',
  HARDCODED_CREDENTIAL: 'Hardcoded credential detected',
};

/**
 * File extensions to scan by default
 */
export const SCANNABLE_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.py',
  '.java',
  '.cs',
  '.go',
  '.rb',
  '.php',
  '.swift',
  '.kt',
  '.rs',
  '.cpp',
  '.c',
  '.h',
  '.sh',
  '.bash',
  '.yml',
  '.yaml',
  '.json',
  '.xml',
  '.env',
  '.config',
];

/**
 * File patterns to exclude from scanning
 */
export const DEFAULT_EXCLUDE_PATTERNS = [
  /node_modules\//,
  /\.git\//,
  /dist\//,
  /build\//,
  /coverage\//,
  /\.next\//,
  /\.nuxt\//,
  /vendor\//,
  /\.min\./,
  /\.map$/,
  /package-lock\.json$/,
  /yarn\.lock$/,
];

// Made with Bob
