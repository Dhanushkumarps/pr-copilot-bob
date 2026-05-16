import {
  SecurityPattern,
  SecurityIssueType,
  SecuritySeverity,
  DEFAULT_RECOMMENDATIONS,
  ISSUE_TYPE_DESCRIPTIONS,
} from '../types/security.types';

/**
 * Security patterns for detecting sensitive information in code
 */
export const SECURITY_PATTERNS: SecurityPattern[] = [
  // AWS Keys
  {
    type: 'AWS_KEY',
    regex: /AKIA[0-9A-Z]{16}/gi,
    severity: 'CRITICAL',
    description: ISSUE_TYPE_DESCRIPTIONS.AWS_KEY,
    recommendation: DEFAULT_RECOMMENDATIONS.AWS_KEY,
    confidence: 0.95,
    checkInComments: false,
    checkInStrings: true,
  },
  {
    type: 'AWS_KEY',
    regex: /aws[_-]?secret[_-]?access[_-]?key[\s:=]+['"]?([a-zA-Z0-9/+=]{40})['"]?/gi,
    severity: 'CRITICAL',
    description: ISSUE_TYPE_DESCRIPTIONS.AWS_KEY,
    recommendation: DEFAULT_RECOMMENDATIONS.AWS_KEY,
    confidence: 0.9,
    checkInComments: false,
    checkInStrings: true,
  },

  // GitHub Tokens
  {
    type: 'GITHUB_TOKEN',
    regex: /ghp_[a-zA-Z0-9]{36}/gi,
    severity: 'CRITICAL',
    description: ISSUE_TYPE_DESCRIPTIONS.GITHUB_TOKEN,
    recommendation: DEFAULT_RECOMMENDATIONS.GITHUB_TOKEN,
    confidence: 0.95,
    checkInComments: false,
    checkInStrings: true,
  },
  {
    type: 'GITHUB_TOKEN',
    regex: /gho_[a-zA-Z0-9]{36}/gi,
    severity: 'CRITICAL',
    description: ISSUE_TYPE_DESCRIPTIONS.GITHUB_TOKEN,
    recommendation: DEFAULT_RECOMMENDATIONS.GITHUB_TOKEN,
    confidence: 0.95,
    checkInComments: false,
    checkInStrings: true,
  },
  {
    type: 'GITHUB_TOKEN',
    regex: /github[_-]?token[\s:=]+['"]?([a-zA-Z0-9]{40})['"]?/gi,
    severity: 'CRITICAL',
    description: ISSUE_TYPE_DESCRIPTIONS.GITHUB_TOKEN,
    recommendation: DEFAULT_RECOMMENDATIONS.GITHUB_TOKEN,
    confidence: 0.85,
    checkInComments: false,
    checkInStrings: true,
  },

  // Google API Keys
  {
    type: 'GOOGLE_API_KEY',
    regex: /AIza[0-9A-Za-z\\-_]{35}/gi,
    severity: 'HIGH',
    description: ISSUE_TYPE_DESCRIPTIONS.GOOGLE_API_KEY,
    recommendation: DEFAULT_RECOMMENDATIONS.GOOGLE_API_KEY,
    confidence: 0.9,
    checkInComments: false,
    checkInStrings: true,
  },

  // Slack Tokens
  {
    type: 'SLACK_TOKEN',
    regex: /xox[baprs]-[0-9a-zA-Z]{10,48}/gi,
    severity: 'HIGH',
    description: ISSUE_TYPE_DESCRIPTIONS.SLACK_TOKEN,
    recommendation: DEFAULT_RECOMMENDATIONS.SLACK_TOKEN,
    confidence: 0.9,
    checkInComments: false,
    checkInStrings: true,
  },

  // Generic API Keys
  {
    type: 'API_KEY',
    regex: /api[_-]?key[\s:=]+['"]([a-zA-Z0-9_\-]{20,})['"]?/gi,
    severity: 'HIGH',
    description: ISSUE_TYPE_DESCRIPTIONS.API_KEY,
    recommendation: DEFAULT_RECOMMENDATIONS.API_KEY,
    confidence: 0.7,
    checkInComments: false,
    checkInStrings: true,
  },
  {
    type: 'API_KEY',
    regex: /apikey[\s:=]+['"]([a-zA-Z0-9_\-]{20,})['"]?/gi,
    severity: 'HIGH',
    description: ISSUE_TYPE_DESCRIPTIONS.API_KEY,
    recommendation: DEFAULT_RECOMMENDATIONS.API_KEY,
    confidence: 0.7,
    checkInComments: false,
    checkInStrings: true,
  },

  // Secret Tokens
  {
    type: 'SECRET_TOKEN',
    regex: /secret[_-]?token[\s:=]+['"]([a-zA-Z0-9_\-]{20,})['"]?/gi,
    severity: 'HIGH',
    description: ISSUE_TYPE_DESCRIPTIONS.SECRET_TOKEN,
    recommendation: DEFAULT_RECOMMENDATIONS.SECRET_TOKEN,
    confidence: 0.75,
    checkInComments: false,
    checkInStrings: true,
  },
  {
    type: 'SECRET_TOKEN',
    regex: /access[_-]?token[\s:=]+['"]([a-zA-Z0-9_\-]{20,})['"]?/gi,
    severity: 'HIGH',
    description: ISSUE_TYPE_DESCRIPTIONS.SECRET_TOKEN,
    recommendation: DEFAULT_RECOMMENDATIONS.SECRET_TOKEN,
    confidence: 0.7,
    checkInComments: false,
    checkInStrings: true,
  },

  // JWT Secrets
  {
    type: 'JWT_SECRET',
    regex: /jwt[_-]?secret[\s:=]+['"]([a-zA-Z0-9_\-]{20,})['"]?/gi,
    severity: 'HIGH',
    description: ISSUE_TYPE_DESCRIPTIONS.JWT_SECRET,
    recommendation: DEFAULT_RECOMMENDATIONS.JWT_SECRET,
    confidence: 0.85,
    checkInComments: false,
    checkInStrings: true,
  },

  // Database URLs
  {
    type: 'DATABASE_URL',
    regex: /(?:postgres|mysql|mongodb|redis):\/\/[^\s'"]+/gi,
    severity: 'HIGH',
    description: ISSUE_TYPE_DESCRIPTIONS.DATABASE_URL,
    recommendation: DEFAULT_RECOMMENDATIONS.DATABASE_URL,
    confidence: 0.85,
    checkInComments: false,
    checkInStrings: true,
  },
  {
    type: 'DATABASE_URL',
    regex: /database[_-]?url[\s:=]+['"]([^'"]+)['"]?/gi,
    severity: 'HIGH',
    description: ISSUE_TYPE_DESCRIPTIONS.DATABASE_URL,
    recommendation: DEFAULT_RECOMMENDATIONS.DATABASE_URL,
    confidence: 0.75,
    checkInComments: false,
    checkInStrings: true,
  },

  // Passwords
  {
    type: 'PASSWORD',
    regex: /password[\s:=]+['"]([^'"]{8,})['"]?/gi,
    severity: 'CRITICAL',
    description: ISSUE_TYPE_DESCRIPTIONS.PASSWORD,
    recommendation: DEFAULT_RECOMMENDATIONS.PASSWORD,
    confidence: 0.6,
    checkInComments: false,
    checkInStrings: true,
  },
  {
    type: 'PASSWORD',
    regex: /passwd[\s:=]+['"]([^'"]{8,})['"]?/gi,
    severity: 'CRITICAL',
    description: ISSUE_TYPE_DESCRIPTIONS.PASSWORD,
    recommendation: DEFAULT_RECOMMENDATIONS.PASSWORD,
    confidence: 0.6,
    checkInComments: false,
    checkInStrings: true,
  },

  // Private Keys
  {
    type: 'PRIVATE_KEY',
    regex: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/gi,
    severity: 'CRITICAL',
    description: ISSUE_TYPE_DESCRIPTIONS.PRIVATE_KEY,
    recommendation: DEFAULT_RECOMMENDATIONS.PRIVATE_KEY,
    confidence: 0.95,
    checkInComments: false,
    checkInStrings: true,
  },
  {
    type: 'PRIVATE_KEY',
    regex: /private[_-]?key[\s:=]+['"]([^'"]{20,})['"]?/gi,
    severity: 'CRITICAL',
    description: ISSUE_TYPE_DESCRIPTIONS.PRIVATE_KEY,
    recommendation: DEFAULT_RECOMMENDATIONS.PRIVATE_KEY,
    confidence: 0.7,
    checkInComments: false,
    checkInStrings: true,
  },

  // Encryption Keys
  {
    type: 'ENCRYPTION_KEY',
    regex: /encryption[_-]?key[\s:=]+['"]([a-zA-Z0-9+/=]{20,})['"]?/gi,
    severity: 'HIGH',
    description: ISSUE_TYPE_DESCRIPTIONS.ENCRYPTION_KEY,
    recommendation: DEFAULT_RECOMMENDATIONS.ENCRYPTION_KEY,
    confidence: 0.75,
    checkInComments: false,
    checkInStrings: true,
  },

  // Certificates
  {
    type: 'CERTIFICATE',
    regex: /-----BEGIN CERTIFICATE-----/gi,
    severity: 'MEDIUM',
    description: ISSUE_TYPE_DESCRIPTIONS.CERTIFICATE,
    recommendation: DEFAULT_RECOMMENDATIONS.CERTIFICATE,
    confidence: 0.9,
    checkInComments: false,
    checkInStrings: true,
  },

  // Email Addresses (lower priority)
  {
    type: 'EMAIL_IN_CODE',
    regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
    severity: 'LOW',
    description: ISSUE_TYPE_DESCRIPTIONS.EMAIL_IN_CODE,
    recommendation: DEFAULT_RECOMMENDATIONS.EMAIL_IN_CODE,
    confidence: 0.5,
    checkInComments: true,
    checkInStrings: true,
    excludeFiles: [
      /package\.json$/,
      /\.md$/,
      /LICENSE$/,
      /AUTHORS$/,
      /CONTRIBUTORS$/,
    ],
  },

  // IP Addresses (lower priority)
  {
    type: 'IP_ADDRESS',
    regex: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/gi,
    severity: 'LOW',
    description: ISSUE_TYPE_DESCRIPTIONS.IP_ADDRESS,
    recommendation: DEFAULT_RECOMMENDATIONS.IP_ADDRESS,
    confidence: 0.4,
    checkInComments: true,
    checkInStrings: true,
    excludeFiles: [/\.md$/, /test/, /spec/],
  },

  // Generic hardcoded credentials
  {
    type: 'HARDCODED_CREDENTIAL',
    regex: /(?:credential|auth|token|secret)[\s:=]+['"]([a-zA-Z0-9_\-]{15,})['"]?/gi,
    severity: 'MEDIUM',
    description: ISSUE_TYPE_DESCRIPTIONS.HARDCODED_CREDENTIAL,
    recommendation: DEFAULT_RECOMMENDATIONS.HARDCODED_CREDENTIAL,
    confidence: 0.5,
    checkInComments: false,
    checkInStrings: true,
  },
];

/**
 * Patterns that are likely false positives and should be excluded
 */
export const FALSE_POSITIVE_PATTERNS = [
  // Common test/example values
  /test/i,
  /example/i,
  /sample/i,
  /dummy/i,
  /fake/i,
  /mock/i,
  /placeholder/i,
  /your[_-]?key/i,
  /your[_-]?token/i,
  /your[_-]?secret/i,
  /xxx+/i,
  /000+/i,
  /111+/i,
  /abc+/i,
  /123+/i,
  
  // Environment variable references
  /process\.env\./,
  /\$\{.*\}/,
  /\$[A-Z_]+/,
  
  // Common non-sensitive patterns
  /localhost/i,
  /127\.0\.0\.1/,
  /0\.0\.0\.0/,
  /192\.168\./,
  /10\.\d+\.\d+\.\d+/,
];

/**
 * File patterns that should be excluded from security scanning
 */
export const EXCLUDED_FILE_PATTERNS = [
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
  /pnpm-lock\.yaml$/,
  /\.lock$/,
];

/**
 * Check if a value is likely a false positive
 */
export function isFalsePositive(value: string): boolean {
  return FALSE_POSITIVE_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Check if a file should be excluded from scanning
 */
export function isExcludedFile(filePath: string): boolean {
  return EXCLUDED_FILE_PATTERNS.some(pattern => pattern.test(filePath));
}

/**
 * Get patterns by severity
 */
export function getPatternsBySeverity(
  severity: SecuritySeverity
): SecurityPattern[] {
  return SECURITY_PATTERNS.filter(pattern => pattern.severity === severity);
}

/**
 * Get patterns by type
 */
export function getPatternsByType(
  type: SecurityIssueType
): SecurityPattern[] {
  return SECURITY_PATTERNS.filter(pattern => pattern.type === type);
}

/**
 * Get high confidence patterns (confidence >= 0.8)
 */
export function getHighConfidencePatterns(): SecurityPattern[] {
  return SECURITY_PATTERNS.filter(pattern => pattern.confidence >= 0.8);
}

/**
 * Get critical patterns (CRITICAL or HIGH severity)
 */
export function getCriticalPatterns(): SecurityPattern[] {
  return SECURITY_PATTERNS.filter(
    pattern => pattern.severity === 'CRITICAL' || pattern.severity === 'HIGH'
  );
}

/**
 * Filter patterns by file
 */
export function filterPatternsForFile(
  patterns: SecurityPattern[],
  filePath: string
): SecurityPattern[] {
  return patterns.filter(pattern => {
    // Check exclude patterns
    if (pattern.excludeFiles) {
      if (pattern.excludeFiles.some(exclude => exclude.test(filePath))) {
        return false;
      }
    }

    // Check include patterns
    if (pattern.includeFiles) {
      return pattern.includeFiles.some(include => include.test(filePath));
    }

    return true;
  });
}

/**
 * Get all active patterns for a file
 */
export function getActivePatternsForFile(filePath: string): SecurityPattern[] {
  // First check if file should be excluded entirely
  if (isExcludedFile(filePath)) {
    return [];
  }

  // Filter patterns based on file-specific rules
  return filterPatternsForFile(SECURITY_PATTERNS, filePath);
}

// Made with Bob