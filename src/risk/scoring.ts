import { GitDiffResult, ChangeSummary } from '../types/git.types';
import { SecurityScanResult } from '../types/security.types';
import {
  SecurityRiskAnalysis,
  ComplexityRiskAnalysis,
  ChangeSizeRiskAnalysis,
  CriticalFilesRiskAnalysis,
  RiskFactorScore,
  RiskFactorCategory,
  DEFAULT_RISK_WEIGHTS,
  COMPLEXITY_THRESHOLDS,
  CHANGE_SIZE_THRESHOLDS,
  CRITICAL_FILE_CATEGORIES,
} from '../types/risk.types';
import { logger } from '../utils/logger';

/**
 * Calculate security risk score from security scan results
 */
export function calculateSecurityRisk(
  securityResult: SecurityScanResult
): SecurityRiskAnalysis {
  logger.debug('Calculating security risk', 'RiskScoring', {
    totalFindings: securityResult.totalFindings,
  });

  const { bySeverity } = securityResult;

  // Calculate score based on severity weights
  // Critical: 25 points each, High: 15, Medium: 8, Low: 3
  const score = Math.min(
    100,
    bySeverity.critical * 25 +
      bySeverity.high * 15 +
      bySeverity.medium * 8 +
      bySeverity.low * 3
  );

  const hasBlockingIssues = bySeverity.critical > 0 || bySeverity.high > 2;

  return {
    findings: securityResult.findings,
    score,
    criticalCount: bySeverity.critical,
    highCount: bySeverity.high,
    mediumCount: bySeverity.medium,
    lowCount: bySeverity.low,
    hasBlockingIssues,
  };
}

/**
 * Calculate complexity risk score from git diff
 */
export function calculateComplexityRisk(
  diffResult: GitDiffResult
): ComplexityRiskAnalysis {
  logger.debug('Calculating complexity risk', 'RiskScoring', {
    totalFiles: diffResult.totalFiles,
  });

  // Estimate complexity based on change patterns
  const complexFiles: string[] = [];
  let totalComplexity = 0;
  let maxComplexity = 0;
  let highComplexityCount = 0;

  for (const file of diffResult.files) {
    // Estimate complexity from hunks and changes
    const fileComplexity = estimateFileComplexity(file);
    totalComplexity += fileComplexity;

    if (fileComplexity > maxComplexity) {
      maxComplexity = fileComplexity;
    }

    if (fileComplexity >= COMPLEXITY_THRESHOLDS.high) {
      highComplexityCount++;
      complexFiles.push(file.path);
    }
  }

  const averageComplexity =
    diffResult.totalFiles > 0 ? totalComplexity / diffResult.totalFiles : 0;

  // Calculate score (0-100)
  // High complexity files contribute more
  const score = Math.min(
    100,
    highComplexityCount * 20 + Math.min(50, averageComplexity * 3)
  );

  return {
    averageComplexity,
    maxComplexity,
    highComplexityCount,
    complexityIncrease: averageComplexity,
    score,
    complexFiles,
  };
}

/**
 * Estimate file complexity from changes
 */
function estimateFileComplexity(file: any): number {
  let complexity = 0;

  // Base complexity from number of changes
  complexity += Math.min(10, file.hunks.length);

  // Add complexity for large changes
  const totalChanges = file.additions + file.deletions;
  complexity += Math.min(10, totalChanges / 50);

  // Add complexity for nested structures (estimated from indentation)
  for (const hunk of file.hunks) {
    for (const change of hunk.changes) {
      if (change.type === 'addition') {
        const indentLevel = (change.content.match(/^\s+/) || [''])[0].length / 2;
        complexity += Math.min(5, indentLevel / 2);
      }
    }
  }

  return Math.min(30, complexity);
}

/**
 * Calculate change size risk score
 */
export function calculateChangeSizeRisk(
  diffResult: GitDiffResult
): ChangeSizeRiskAnalysis {
  logger.debug('Calculating change size risk', 'RiskScoring', {
    filesChanged: diffResult.totalFiles,
    linesAdded: diffResult.totalAdditions,
    linesDeleted: diffResult.totalDeletions,
  });

  const filesChanged = diffResult.totalFiles;
  const linesAdded = diffResult.totalAdditions;
  const linesDeleted = diffResult.totalDeletions;
  const netLinesChanged = Math.abs(linesAdded - linesDeleted);

  // Calculate score based on thresholds
  let score = 0;

  // File count contribution (0-40 points)
  if (filesChanged >= CHANGE_SIZE_THRESHOLDS.largeFiles) {
    score += 40;
  } else if (filesChanged >= CHANGE_SIZE_THRESHOLDS.mediumFiles) {
    score += 20;
  } else {
    score += (filesChanged / CHANGE_SIZE_THRESHOLDS.mediumFiles) * 20;
  }

  // Line count contribution (0-60 points)
  const totalLines = linesAdded + linesDeleted;
  if (totalLines >= CHANGE_SIZE_THRESHOLDS.largeLines) {
    score += 60;
  } else if (totalLines >= CHANGE_SIZE_THRESHOLDS.mediumLines) {
    score += 30;
  } else {
    score += (totalLines / CHANGE_SIZE_THRESHOLDS.mediumLines) * 30;
  }

  const isTooLarge =
    filesChanged >= CHANGE_SIZE_THRESHOLDS.largeFiles ||
    totalLines >= CHANGE_SIZE_THRESHOLDS.largeLines;

  // Suggest split if too large
  let recommendedSplit: string[] | undefined;
  if (isTooLarge) {
    recommendedSplit = suggestChangeSplit(diffResult);
  }

  return {
    filesChanged,
    linesAdded,
    linesDeleted,
    netLinesChanged,
    score: Math.min(100, score),
    isTooLarge,
    recommendedSplit,
  };
}

/**
 * Suggest how to split large changes
 */
function suggestChangeSplit(diffResult: GitDiffResult): string[] {
  const suggestions: string[] = [];

  // Group by directory
  const byDirectory = new Map<string, number>();
  for (const file of diffResult.files) {
    const dir = file.path.substring(0, file.path.lastIndexOf('/')) || '.';
    byDirectory.set(dir, (byDirectory.get(dir) || 0) + 1);
  }

  // Suggest splitting by directory if multiple directories affected
  if (byDirectory.size > 1) {
    const sortedDirs = Array.from(byDirectory.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    suggestions.push(
      `Split by directory: ${sortedDirs.map(([dir, count]) => `${dir} (${count} files)`).join(', ')}`
    );
  }

  // Suggest splitting by file type
  const byType = new Map<string, number>();
  for (const file of diffResult.files) {
    const ext = file.path.substring(file.path.lastIndexOf('.'));
    byType.set(ext, (byType.get(ext) || 0) + 1);
  }

  if (byType.size > 1) {
    suggestions.push(
      `Split by type: ${Array.from(byType.entries())
        .map(([ext, count]) => `${ext} (${count} files)`)
        .join(', ')}`
    );
  }

  return suggestions;
}

/**
 * Calculate critical files risk score
 */
export function calculateCriticalFilesRisk(
  diffResult: GitDiffResult,
  changeSummary: ChangeSummary
): CriticalFilesRiskAnalysis {
  logger.debug('Calculating critical files risk', 'RiskScoring', {
    criticalFiles: changeSummary.criticalFiles.length,
  });

  const criticalFiles = changeSummary.criticalFiles;
  const criticalFileCount = criticalFiles.length;

  // Categorize critical files
  const criticalFileTypes: string[] = [];
  const affectedCategories = new Set<string>();

  for (const file of criticalFiles) {
    for (const [category, patterns] of Object.entries(CRITICAL_FILE_CATEGORIES)) {
      if (patterns.some(pattern => pattern.test(file))) {
        affectedCategories.add(category);
      }
    }
  }

  criticalFileTypes.push(...Array.from(affectedCategories));

  // Calculate score
  // Each critical file adds points, with diminishing returns
  let score = 0;
  for (let i = 0; i < criticalFileCount; i++) {
    score += Math.max(5, 30 - i * 5); // First file: 30, second: 25, etc.
  }

  // Bonus for affecting core categories
  if (affectedCategories.has('core') || affectedCategories.has('authentication')) {
    score += 20;
  }

  const affectsCoreFunction =
    affectedCategories.has('core') ||
    affectedCategories.has('api') ||
    affectedCategories.has('database');

  return {
    criticalFiles,
    criticalFileCount,
    criticalFileTypes,
    score: Math.min(100, score),
    affectsCoreFunction,
  };
}

/**
 * Calculate overall risk score with weights
 */
export function calculateOverallRiskScore(
  securityScore: number,
  complexityScore: number,
  changeSizeScore: number,
  criticalFilesScore: number,
  weights = DEFAULT_RISK_WEIGHTS
): number {
  const overallScore =
    securityScore * weights.security +
    complexityScore * weights.complexity +
    changeSizeScore * weights.changeSize +
    criticalFilesScore * weights.criticalFiles;

  return Math.min(100, Math.max(0, overallScore));
}

/**
 * Create risk factor score object
 */
export function createRiskFactorScore(
  category: RiskFactorCategory,
  score: number,
  weight: number,
  explanation: string,
  details: string[]
): RiskFactorScore {
  return {
    category,
    score,
    weight,
    weightedScore: score * weight,
    explanation,
    details,
  };
}

/**
 * Generate explanation for security risk
 */
export function explainSecurityRisk(analysis: SecurityRiskAnalysis): {
  explanation: string;
  details: string[];
} {
  const { criticalCount, highCount, mediumCount, lowCount } = analysis;

  let explanation = '';
  const details: string[] = [];

  if (criticalCount > 0) {
    explanation = `${criticalCount} critical security issue(s) found`;
    details.push(`${criticalCount} critical severity findings`);
  } else if (highCount > 0) {
    explanation = `${highCount} high severity security issue(s) found`;
    details.push(`${highCount} high severity findings`);
  } else if (mediumCount > 0) {
    explanation = `${mediumCount} medium severity security issue(s) found`;
    details.push(`${mediumCount} medium severity findings`);
  } else if (lowCount > 0) {
    explanation = `${lowCount} low severity security issue(s) found`;
    details.push(`${lowCount} low severity findings`);
  } else {
    explanation = 'No security issues detected';
    details.push('Clean security scan');
  }

  if (analysis.hasBlockingIssues) {
    details.push('⚠️ Contains blocking security issues');
  }

  return { explanation, details };
}

/**
 * Generate explanation for complexity risk
 */
export function explainComplexityRisk(analysis: ComplexityRiskAnalysis): {
  explanation: string;
  details: string[];
} {
  const { averageComplexity, highComplexityCount, complexFiles } = analysis;

  let explanation = '';
  const details: string[] = [];

  if (highComplexityCount > 0) {
    explanation = `${highComplexityCount} file(s) with high complexity`;
    details.push(`Average complexity: ${averageComplexity.toFixed(1)}`);
    details.push(`High complexity files: ${complexFiles.join(', ')}`);
  } else if (averageComplexity >= COMPLEXITY_THRESHOLDS.medium) {
    explanation = 'Moderate code complexity';
    details.push(`Average complexity: ${averageComplexity.toFixed(1)}`);
  } else {
    explanation = 'Low code complexity';
    details.push(`Average complexity: ${averageComplexity.toFixed(1)}`);
  }

  return { explanation, details };
}

/**
 * Generate explanation for change size risk
 */
export function explainChangeSizeRisk(analysis: ChangeSizeRiskAnalysis): {
  explanation: string;
  details: string[];
} {
  const { filesChanged, linesAdded, linesDeleted, isTooLarge } = analysis;

  let explanation = '';
  const details: string[] = [];

  if (isTooLarge) {
    explanation = 'Large change set - consider splitting';
    details.push(`${filesChanged} files changed`);
    details.push(`+${linesAdded} -${linesDeleted} lines`);
    if (analysis.recommendedSplit) {
      details.push(...analysis.recommendedSplit);
    }
  } else if (filesChanged >= CHANGE_SIZE_THRESHOLDS.mediumFiles) {
    explanation = 'Medium-sized change set';
    details.push(`${filesChanged} files changed`);
    details.push(`+${linesAdded} -${linesDeleted} lines`);
  } else {
    explanation = 'Small, focused change set';
    details.push(`${filesChanged} files changed`);
    details.push(`+${linesAdded} -${linesDeleted} lines`);
  }

  return { explanation, details };
}

/**
 * Generate explanation for critical files risk
 */
export function explainCriticalFilesRisk(analysis: CriticalFilesRiskAnalysis): {
  explanation: string;
  details: string[];
} {
  const { criticalFileCount, criticalFileTypes, affectsCoreFunction } = analysis;

  let explanation = '';
  const details: string[] = [];

  if (criticalFileCount > 0) {
    explanation = `${criticalFileCount} critical file(s) affected`;
    details.push(`Categories: ${criticalFileTypes.join(', ')}`);
    if (affectsCoreFunction) {
      details.push('⚠️ Affects core functionality');
    }
  } else {
    explanation = 'No critical files affected';
    details.push('Changes are in non-critical areas');
  }

  return { explanation, details };
}

// Made with Bob