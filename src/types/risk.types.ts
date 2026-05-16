import { SecurityFinding } from './security.types';

/**
 * Risk level classification
 */
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * Risk factor categories
 */
export type RiskFactorCategory = 'security' | 'complexity' | 'changeSize' | 'criticalFiles';

/**
 * Individual risk factor score
 */
export interface RiskFactorScore {
  /** Category of risk factor */
  category: RiskFactorCategory;
  /** Raw score (0-100) */
  score: number;
  /** Weight applied to this factor (0-1) */
  weight: number;
  /** Weighted score contribution */
  weightedScore: number;
  /** Explanation of the score */
  explanation: string;
  /** Details contributing to the score */
  details: string[];
}

/**
 * Complete risk assessment result
 */
export interface RiskAssessment {
  /** Overall risk level */
  overallRisk: RiskLevel;
  /** Overall risk score (0-100) */
  overallScore: number;
  /** Individual factor scores */
  factors: RiskFactorScore[];
  /** Recommendations to reduce risk */
  recommendations: string[];
  /** Critical issues that must be addressed */
  criticalIssues: string[];
  /** Assessment timestamp */
  timestamp: Date;
  /** Assessment duration in milliseconds */
  durationMs: number;
}

/**
 * Security risk analysis
 */
export interface SecurityRiskAnalysis {
  /** Security findings */
  findings: SecurityFinding[];
  /** Risk score based on findings (0-100) */
  score: number;
  /** Number of critical findings */
  criticalCount: number;
  /** Number of high severity findings */
  highCount: number;
  /** Number of medium severity findings */
  mediumCount: number;
  /** Number of low severity findings */
  lowCount: number;
  /** Whether there are blocking issues */
  hasBlockingIssues: boolean;
}

/**
 * Code complexity analysis
 */
export interface ComplexityRiskAnalysis {
  /** Average cyclomatic complexity */
  averageComplexity: number;
  /** Maximum cyclomatic complexity */
  maxComplexity: number;
  /** Number of highly complex functions */
  highComplexityCount: number;
  /** Complexity increase from changes */
  complexityIncrease: number;
  /** Risk score based on complexity (0-100) */
  score: number;
  /** Files with high complexity */
  complexFiles: string[];
}

/**
 * Change size analysis
 */
export interface ChangeSizeRiskAnalysis {
  /** Total files changed */
  filesChanged: number;
  /** Total lines added */
  linesAdded: number;
  /** Total lines deleted */
  linesDeleted: number;
  /** Net lines changed */
  netLinesChanged: number;
  /** Risk score based on change size (0-100) */
  score: number;
  /** Whether changes are too large */
  isTooLarge: boolean;
  /** Recommended split if too large */
  recommendedSplit?: string[];
}

/**
 * Critical files analysis
 */
export interface CriticalFilesRiskAnalysis {
  /** Critical files changed */
  criticalFiles: string[];
  /** Number of critical files */
  criticalFileCount: number;
  /** Types of critical files changed */
  criticalFileTypes: string[];
  /** Risk score based on critical files (0-100) */
  score: number;
  /** Whether core functionality is affected */
  affectsCoreFunction: boolean;
}

/**
 * Risk assessment configuration
 */
export interface RiskAssessmentConfig {
  /** Risk thresholds */
  thresholds: {
    high: number;
    medium: number;
  };
  /** Factor weights */
  weights: {
    security: number;
    complexity: number;
    changeSize: number;
    criticalFiles: number;
  };
  /** Complexity thresholds */
  complexity: {
    high: number;
    medium: number;
  };
  /** Change size thresholds */
  changeSize: {
    largeFiles: number;
    largeLines: number;
  };
}

/**
 * Risk mitigation suggestion
 */
export interface RiskMitigation {
  /** Risk factor being addressed */
  factor: RiskFactorCategory;
  /** Severity of the risk */
  severity: RiskLevel;
  /** Mitigation action */
  action: string;
  /** Priority (1-5, 5 being highest) */
  priority: number;
  /** Estimated effort (hours) */
  estimatedEffort?: number;
  /** Impact of mitigation (0-1) */
  impact: number;
}

/**
 * Risk trend analysis (for future use)
 */
export interface RiskTrend {
  /** Current risk score */
  current: number;
  /** Previous risk score (if available) */
  previous?: number;
  /** Trend direction */
  trend: 'increasing' | 'decreasing' | 'stable';
  /** Change percentage */
  changePercent?: number;
}

/**
 * Risk assessment summary for display
 */
export interface RiskAssessmentSummary {
  /** Risk level with emoji */
  level: string;
  /** Overall score */
  score: number;
  /** Key concerns */
  concerns: string[];
  /** Quick recommendations */
  quickFixes: string[];
  /** Estimated review time */
  estimatedReviewTime: string;
}

/**
 * Risk scoring weights (default values)
 */
export const DEFAULT_RISK_WEIGHTS = {
  security: 0.4,
  complexity: 0.3,
  changeSize: 0.15,
  criticalFiles: 0.15,
};

/**
 * Risk thresholds (default values)
 */
export const DEFAULT_RISK_THRESHOLDS = {
  high: 75,
  medium: 40,
};

/**
 * Complexity thresholds
 */
export const COMPLEXITY_THRESHOLDS = {
  high: 15,
  medium: 10,
  low: 5,
};

/**
 * Change size thresholds
 */
export const CHANGE_SIZE_THRESHOLDS = {
  largeFiles: 20,
  largeLines: 500,
  mediumFiles: 10,
  mediumLines: 200,
};

/**
 * Critical file patterns by category
 */
export const CRITICAL_FILE_CATEGORIES: Record<string, RegExp[]> = {
  authentication: [/auth/, /login/, /session/, /token/],
  authorization: [/permission/, /role/, /access/, /policy/],
  database: [/migration/, /schema/, /model/, /entity/],
  api: [/api/, /endpoint/, /route/, /controller/],
  security: [/security/, /crypto/, /encrypt/, /hash/],
  configuration: [/config/, /\.env/, /settings/],
  core: [/core/, /main/, /app/, /index/],
};

/**
 * Risk level colors for display
 */
export const RISK_LEVEL_COLORS = {
  LOW: 'green',
  MEDIUM: 'yellow',
  HIGH: 'red',
};

/**
 * Risk level emojis
 */
export const RISK_LEVEL_EMOJIS = {
  LOW: '✅',
  MEDIUM: '⚠️',
  HIGH: '🚨',
};

/**
 * Risk factor descriptions
 */
export const RISK_FACTOR_DESCRIPTIONS: Record<RiskFactorCategory, string> = {
  security: 'Security vulnerabilities and sensitive data exposure',
  complexity: 'Code complexity and maintainability concerns',
  changeSize: 'Size and scope of changes',
  criticalFiles: 'Impact on critical system components',
};

/**
 * Helper function to determine risk level from score
 */
export function getRiskLevel(score: number, thresholds: { high: number; medium: number }): RiskLevel {
  if (score >= thresholds.high) return 'HIGH';
  if (score >= thresholds.medium) return 'MEDIUM';
  return 'LOW';
}

/**
 * Helper function to calculate weighted score
 */
export function calculateWeightedScore(
  scores: Record<RiskFactorCategory, number>,
  weights: Record<RiskFactorCategory, number>
): number {
  return (
    scores.security * weights.security +
    scores.complexity * weights.complexity +
    scores.changeSize * weights.changeSize +
    scores.criticalFiles * weights.criticalFiles
  );
}

/**
 * Helper function to format risk score as percentage
 */
export function formatRiskScore(score: number): string {
  return `${Math.round(score)}%`;
}

/**
 * Helper function to get risk level emoji
 */
export function getRiskEmoji(level: RiskLevel): string {
  return RISK_LEVEL_EMOJIS[level];
}

/**
 * Helper function to estimate review time based on risk
 */
export function estimateReviewTime(assessment: RiskAssessment): string {
  const { overallScore } = assessment;
  
  if (overallScore >= 75) {
    return '2-4 hours (thorough review required)';
  } else if (overallScore >= 40) {
    return '1-2 hours (careful review recommended)';
  } else {
    return '30-60 minutes (standard review)';
  }
}

// Made with Bob
