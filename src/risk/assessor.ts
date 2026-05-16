import { GitDiffResult, ChangeSummary } from '../types/git.types';
import { SecurityScanResult } from '../types/security.types';
import {
  RiskAssessment,
  RiskLevel,
  RiskFactorScore,
  RiskAssessmentConfig,
  getRiskLevel,
} from '../types/risk.types';
import {
  calculateSecurityRisk,
  calculateComplexityRisk,
  calculateChangeSizeRisk,
  calculateCriticalFilesRisk,
  calculateOverallRiskScore,
  createRiskFactorScore,
  explainSecurityRisk,
  explainComplexityRisk,
  explainChangeSizeRisk,
  explainCriticalFilesRisk,
} from './scoring';
import { logger } from '../utils/logger';
import { getConfig } from '../utils/config';

/**
 * RiskAssessor class for comprehensive risk assessment
 */
export class RiskAssessor {
  private config: RiskAssessmentConfig;

  constructor(config?: Partial<RiskAssessmentConfig>) {
    const appConfig = getConfig();

    this.config = {
      thresholds: config?.thresholds || {
        high: appConfig.risk.thresholds.high,
        medium: appConfig.risk.thresholds.medium,
      },
      weights: config?.weights || appConfig.risk.weights,
      complexity: config?.complexity || {
        high: 15,
        medium: 10,
      },
      changeSize: config?.changeSize || {
        largeFiles: 20,
        largeLines: 500,
      },
    };
  }

  /**
   * Perform complete risk assessment
   */
  async assessRisk(
    diffResult: GitDiffResult,
    changeSummary: ChangeSummary,
    securityResult: SecurityScanResult
  ): Promise<RiskAssessment> {
    logger.info('Starting risk assessment', 'RiskAssessor', {
      files: diffResult.totalFiles,
      securityFindings: securityResult.totalFindings,
    });

    const startTime = Date.now();

    // Calculate individual risk factors
    const securityAnalysis = calculateSecurityRisk(securityResult);
    const complexityAnalysis = calculateComplexityRisk(diffResult);
    const changeSizeAnalysis = calculateChangeSizeRisk(diffResult);
    const criticalFilesAnalysis = calculateCriticalFilesRisk(
      diffResult,
      changeSummary
    );

    // Create factor scores with explanations
    const factors: RiskFactorScore[] = [];

    // Security factor
    const securityExplanation = explainSecurityRisk(securityAnalysis);
    factors.push(
      createRiskFactorScore(
        'security',
        securityAnalysis.score,
        this.config.weights.security,
        securityExplanation.explanation,
        securityExplanation.details
      )
    );

    // Complexity factor
    const complexityExplanation = explainComplexityRisk(complexityAnalysis);
    factors.push(
      createRiskFactorScore(
        'complexity',
        complexityAnalysis.score,
        this.config.weights.complexity,
        complexityExplanation.explanation,
        complexityExplanation.details
      )
    );

    // Change size factor
    const changeSizeExplanation = explainChangeSizeRisk(changeSizeAnalysis);
    factors.push(
      createRiskFactorScore(
        'changeSize',
        changeSizeAnalysis.score,
        this.config.weights.changeSize,
        changeSizeExplanation.explanation,
        changeSizeExplanation.details
      )
    );

    // Critical files factor
    const criticalFilesExplanation = explainCriticalFilesRisk(
      criticalFilesAnalysis
    );
    factors.push(
      createRiskFactorScore(
        'criticalFiles',
        criticalFilesAnalysis.score,
        this.config.weights.criticalFiles,
        criticalFilesExplanation.explanation,
        criticalFilesExplanation.details
      )
    );

    // Calculate overall score
    const overallScore = calculateOverallRiskScore(
      securityAnalysis.score,
      complexityAnalysis.score,
      changeSizeAnalysis.score,
      criticalFilesAnalysis.score,
      this.config.weights
    );

    // Determine risk level
    const overallRisk = getRiskLevel(overallScore, this.config.thresholds);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      overallRisk,
      factors,
      securityAnalysis,
      complexityAnalysis,
      changeSizeAnalysis,
      criticalFilesAnalysis
    );

    // Identify critical issues
    const criticalIssues = this.identifyCriticalIssues(
      securityAnalysis,
      complexityAnalysis,
      changeSizeAnalysis,
      criticalFilesAnalysis
    );

    const durationMs = Date.now() - startTime;

    logger.info('Risk assessment complete', 'RiskAssessor', {
      overallRisk,
      overallScore: overallScore.toFixed(1),
      durationMs,
    });

    return {
      overallRisk,
      overallScore,
      factors,
      recommendations,
      criticalIssues,
      timestamp: new Date(),
      durationMs,
    };
  }

  /**
   * Generate recommendations based on risk factors
   */
  private generateRecommendations(
    overallRisk: RiskLevel,
    _factors: RiskFactorScore[],
    securityAnalysis: any,
    complexityAnalysis: any,
    changeSizeAnalysis: any,
    criticalFilesAnalysis: any
  ): string[] {
    const recommendations: string[] = [];

    // Security recommendations
    if (securityAnalysis.score > 50) {
      if (securityAnalysis.criticalCount > 0) {
        recommendations.push(
          '🚨 CRITICAL: Fix all critical security issues before merging'
        );
        recommendations.push(
          'Remove hardcoded secrets and use environment variables'
        );
      }
      if (securityAnalysis.highCount > 0) {
        recommendations.push(
          '⚠️ Address high severity security findings'
        );
      }
      if (securityAnalysis.hasBlockingIssues) {
        recommendations.push(
          'Security scan has blocking issues - review required'
        );
      }
    }

    // Complexity recommendations
    if (complexityAnalysis.score > 50) {
      if (complexityAnalysis.highComplexityCount > 0) {
        recommendations.push(
          'Consider refactoring high complexity functions'
        );
        recommendations.push(
          `Review these files: ${complexityAnalysis.complexFiles.slice(0, 3).join(', ')}`
        );
      }
      recommendations.push('Add unit tests for complex logic');
    }

    // Change size recommendations
    if (changeSizeAnalysis.isTooLarge) {
      recommendations.push(
        '📦 Consider splitting this PR into smaller, focused changes'
      );
      if (changeSizeAnalysis.recommendedSplit) {
        recommendations.push(
          `Suggested splits: ${changeSizeAnalysis.recommendedSplit[0]}`
        );
      }
    }

    // Critical files recommendations
    if (criticalFilesAnalysis.affectsCoreFunction) {
      recommendations.push(
        '🔍 Extra review needed - changes affect core functionality'
      );
      recommendations.push(
        'Ensure comprehensive test coverage for critical changes'
      );
    }

    // General recommendations based on overall risk
    if (overallRisk === 'HIGH') {
      recommendations.push(
        '⏰ Schedule thorough code review with senior team members'
      );
      recommendations.push(
        'Consider staging deployment before production'
      );
    } else if (overallRisk === 'MEDIUM') {
      recommendations.push(
        '👀 Standard code review recommended'
      );
      recommendations.push(
        'Verify test coverage is adequate'
      );
    } else {
      recommendations.push(
        '✅ Low risk - standard review process applies'
      );
    }

    // Add testing recommendations
    if (complexityAnalysis.score > 30 || criticalFilesAnalysis.score > 30) {
      recommendations.push(
        'Add integration tests for changed components'
      );
    }

    return recommendations;
  }

  /**
   * Identify critical issues that must be addressed
   */
  private identifyCriticalIssues(
    securityAnalysis: any,
    complexityAnalysis: any,
    changeSizeAnalysis: any,
    criticalFilesAnalysis: any
  ): string[] {
    const issues: string[] = [];

    // Critical security issues
    if (securityAnalysis.criticalCount > 0) {
      issues.push(
        `${securityAnalysis.criticalCount} critical security vulnerability(ies) detected`
      );
    }

    // Blocking security issues
    if (securityAnalysis.hasBlockingIssues) {
      issues.push(
        'Security scan contains blocking issues that prevent merge'
      );
    }

    // Extremely high complexity
    if (complexityAnalysis.highComplexityCount > 3) {
      issues.push(
        `${complexityAnalysis.highComplexityCount} files with very high complexity`
      );
    }

    // Very large changes
    if (changeSizeAnalysis.filesChanged > 30) {
      issues.push(
        `Large change set (${changeSizeAnalysis.filesChanged} files) - difficult to review`
      );
    }

    // Critical system files
    if (
      criticalFilesAnalysis.affectsCoreFunction &&
      criticalFilesAnalysis.criticalFileCount > 5
    ) {
      issues.push(
        `${criticalFilesAnalysis.criticalFileCount} critical system files modified`
      );
    }

    return issues;
  }

  /**
   * Get risk assessment summary for quick display
   */
  getSummary(assessment: RiskAssessment): {
    level: string;
    score: number;
    concerns: string[];
    quickFixes: string[];
    estimatedReviewTime: string;
  } {
    const concerns: string[] = [];
    const quickFixes: string[] = [];

    // Extract top concerns from factors
    for (const factor of assessment.factors) {
      if (factor.score > 50) {
        concerns.push(`${factor.category}: ${factor.explanation}`);
      }
    }

    // Extract quick fixes from recommendations
    for (const rec of assessment.recommendations) {
      if (rec.includes('Fix') || rec.includes('Remove') || rec.includes('Add')) {
        quickFixes.push(rec);
      }
    }

    // Estimate review time
    let estimatedReviewTime = '30-60 minutes';
    if (assessment.overallScore >= 75) {
      estimatedReviewTime = '2-4 hours';
    } else if (assessment.overallScore >= 40) {
      estimatedReviewTime = '1-2 hours';
    }

    return {
      level: assessment.overallRisk,
      score: Math.round(assessment.overallScore),
      concerns: concerns.slice(0, 3),
      quickFixes: quickFixes.slice(0, 3),
      estimatedReviewTime,
    };
  }

  /**
   * Check if changes are safe to merge
   */
  isSafeToMerge(assessment: RiskAssessment): {
    safe: boolean;
    reason?: string;
  } {
    // Block if critical issues exist
    if (assessment.criticalIssues.length > 0) {
      return {
        safe: false,
        reason: `Critical issues must be resolved: ${assessment.criticalIssues[0]}`,
      };
    }

    // Block if overall risk is too high
    if (assessment.overallScore >= 90) {
      return {
        safe: false,
        reason: 'Risk score too high - requires significant changes',
      };
    }

    // Warn if risk is high but not blocking
    if (assessment.overallRisk === 'HIGH') {
      return {
        safe: false,
        reason: 'High risk - thorough review and testing required before merge',
      };
    }

    return { safe: true };
  }

  /**
   * Get detailed risk breakdown
   */
  getDetailedBreakdown(assessment: RiskAssessment): string {
    let breakdown = '## Risk Factor Breakdown\n\n';

    for (const factor of assessment.factors) {
      const percentage = (factor.weight * 100).toFixed(0);
      breakdown += `### ${factor.category} (Weight: ${percentage}%)\n`;
      breakdown += `- Score: ${factor.score.toFixed(1)}/100\n`;
      breakdown += `- Weighted: ${factor.weightedScore.toFixed(1)}\n`;
      breakdown += `- ${factor.explanation}\n`;
      
      if (factor.details.length > 0) {
        breakdown += '\nDetails:\n';
        factor.details.forEach(detail => {
          breakdown += `  - ${detail}\n`;
        });
      }
      breakdown += '\n';
    }

    return breakdown;
  }
}

/**
 * Create a RiskAssessor instance
 */
export function createRiskAssessor(
  config?: Partial<RiskAssessmentConfig>
): RiskAssessor {
  return new RiskAssessor(config);
}

// Made with Bob