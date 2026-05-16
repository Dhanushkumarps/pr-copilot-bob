import { GitDiffResult, ChangeSummary } from '../types/git.types';
import { SecurityScanResult } from '../types/security.types';
import { RiskAssessment, getRiskEmoji } from '../types/risk.types';
import {
  GeneratedPRTitle,
  GeneratedPRDescription,
  GeneratedTestSuggestions,
} from '../types/ai.types';
import { getConfig } from '../utils/config';

/**
 * Complete PR analysis result for formatting
 */
export interface PRAnalysisResult {
  diff: GitDiffResult;
  changeSummary: ChangeSummary;
  security: SecurityScanResult;
  risk: RiskAssessment;
  prTitle?: GeneratedPRTitle;
  prDescription?: GeneratedPRDescription;
  testSuggestions?: GeneratedTestSuggestions;
}

/**
 * OutputFormatter class for formatting analysis results as markdown
 */
export class OutputFormatter {
  private useEmojis: boolean;

  constructor() {
    const config = getConfig();
    this.useEmojis = config.output.emojis;
  }

  /**
   * Format complete PR analysis as markdown
   */
  formatComplete(result: PRAnalysisResult): string {
    let output = '';

    // Header
    output += this.formatHeader(result);
    output += '\n\n';

    // Risk Assessment (most important - show first)
    output += this.formatRiskAssessment(result.risk);
    output += '\n\n';

    // PR Title and Description
    if (result.prTitle && result.prDescription) {
      output += this.formatPRContent(result.prTitle, result.prDescription);
      output += '\n\n';
    }

    // Change Summary
    output += this.formatChangeSummary(result.diff, result.changeSummary);
    output += '\n\n';

    // Security Findings
    if (result.security.totalFindings > 0) {
      output += this.formatSecurityFindings(result.security);
      output += '\n\n';
    }

    // Test Suggestions
    if (result.testSuggestions && result.testSuggestions.totalSuggestions > 0) {
      output += this.formatTestSuggestions(result.testSuggestions);
      output += '\n\n';
    }

    // Footer with next steps
    output += this.formatFooter(result.risk);

    return output;
  }

  /**
   * Format header section
   */
  private formatHeader(result: PRAnalysisResult): string {
    const emoji = this.useEmojis ? '🚀 ' : '';
    let header = `${emoji}# PR Readiness Analysis\n\n`;
    
    header += `**Files Changed:** ${result.diff.totalFiles} | `;
    header += `**Lines:** +${result.diff.totalAdditions} -${result.diff.totalDeletions}`;
    
    if (result.diff.baseBranch) {
      header += ` | **Base:** ${result.diff.baseBranch}`;
    }

    return header;
  }
  /**
   * Format risk assessment section
   */
  private formatRiskAssessment(risk: RiskAssessment): string {
    const emoji = getRiskEmoji(risk.overallRisk);
    let output = `## ${emoji} Risk Assessment\n\n`;

    // Overall risk
    output += `**Overall Risk:** ${risk.overallRisk} (${Math.round(risk.overallScore)}/100)\n\n`;

    // Risk factors breakdown
    output += '### Risk Factors\n\n';
    for (const factor of risk.factors) {
      const icon = this.getFactorIcon(factor.category);
      const percentage = (factor.weight * 100).toFixed(0);
      output += `${icon} **${this.capitalize(factor.category)}** (${percentage}% weight)\n`;
      output += `  - Score: ${factor.score.toFixed(1)}/100\n`;
      output += `  - ${factor.explanation}\n`;
      
      if (factor.details.length > 0 && factor.score > 30) {
        factor.details.slice(0, 2).forEach(detail => {
          output += `    - ${detail}\n`;
        });
      }
      output += '\n';
    }

    // Critical issues
    if (risk.criticalIssues.length > 0) {
      output += '### 🚨 Critical Issues\n\n';
      risk.criticalIssues.forEach(issue => {
        output += `- ${issue}\n`;
      });
      output += '\n';
    }

    // Recommendations
    if (risk.recommendations.length > 0) {
      output += '### 💡 Recommendations\n\n';
      risk.recommendations.slice(0, 5).forEach(rec => {
        output += `- ${rec}\n`;
      });
    }

    return output;
  }

  /**
   * Format PR title and description
   */
  private formatPRContent(
    title: GeneratedPRTitle,
    description: GeneratedPRDescription
  ): string {
    const emoji = this.useEmojis ? '📝 ' : '';
    let output = `## ${emoji}Suggested PR Content\n\n`;

    // Title
    output += '### Title\n\n';
    output += `\`\`\`\n${title.title}\n\`\`\`\n\n`;
    
    if (title.isConventional) {
      output += `${this.useEmojis ? '✅' : '✓'} Follows conventional commit format\n\n`;
    }

    // Description
    output += '### Description\n\n';
    
    if (description.whatChanged) {
      output += '**What Changed**\n\n';
      output += description.whatChanged + '\n\n';
    }

    if (description.whyChanged) {
      output += '**Why**\n\n';
      output += description.whyChanged + '\n\n';
    }

    if (description.impact) {
      output += '**Impact**\n\n';
      output += description.impact + '\n\n';
    }

    if (description.breakingChanges && description.breakingChanges.length > 0) {
      output += '**⚠️ Breaking Changes**\n\n';
      description.breakingChanges.forEach(change => {
        output += `- ${change}\n`;
      });
      output += '\n';
    }

    return output;
  }

  /**
   * Format change summary
   */
  private formatChangeSummary(
    _diff: GitDiffResult,
    summary: ChangeSummary
  ): string {
    const emoji = this.useEmojis ? '📊 ' : '';
    let output = `## ${emoji}Change Summary\n\n`;

    // Files by status
    if (summary.added.length > 0) {
      output += `**Added (${summary.added.length}):** `;
      output += summary.added.slice(0, 3).join(', ');
      if (summary.added.length > 3) {
        output += ` and ${summary.added.length - 3} more`;
      }
      output += '\n\n';
    }

    if (summary.modified.length > 0) {
      output += `**Modified (${summary.modified.length}):** `;
      output += summary.modified.slice(0, 3).join(', ');
      if (summary.modified.length > 3) {
        output += ` and ${summary.modified.length - 3} more`;
      }
      output += '\n\n';
    }

    if (summary.deleted.length > 0) {
      output += `**Deleted (${summary.deleted.length}):** `;
      output += summary.deleted.slice(0, 3).join(', ');
      if (summary.deleted.length > 3) {
        output += ` and ${summary.deleted.length - 3} more`;
      }
      output += '\n\n';
    }

    // Special file categories
    if (summary.criticalFiles.length > 0) {
      output += `${this.useEmojis ? '🔴 ' : ''}**Critical Files (${summary.criticalFiles.length}):** `;
      output += summary.criticalFiles.slice(0, 3).join(', ');
      if (summary.criticalFiles.length > 3) {
        output += ` and ${summary.criticalFiles.length - 3} more`;
      }
      output += '\n\n';
    }

    if (summary.testFiles.length > 0) {
      output += `${this.useEmojis ? '🧪 ' : ''}**Test Files (${summary.testFiles.length}):** `;
      output += summary.testFiles.slice(0, 3).join(', ');
      if (summary.testFiles.length > 3) {
        output += ` and ${summary.testFiles.length - 3} more`;
      }
      output += '\n\n';
    }

    return output;
  }

  /**
   * Format security findings
   */
  private formatSecurityFindings(security: SecurityScanResult): string {
    const emoji = this.useEmojis ? '🔒 ' : '';
    let output = `## ${emoji}Security Findings\n\n`;

    output += `**Total Issues:** ${security.totalFindings}\n`;
    output += `- Critical: ${security.bySeverity.critical}\n`;
    output += `- High: ${security.bySeverity.high}\n`;
    output += `- Medium: ${security.bySeverity.medium}\n`;
    output += `- Low: ${security.bySeverity.low}\n\n`;

    if (security.hasCriticalIssues) {
      output += '⚠️ **Contains critical security issues that must be fixed!**\n\n';
    }

    // Show top findings
    if (security.findings.length > 0) {
      output += '### Top Findings\n\n';
      const topFindings = security.findings
        .sort((a, b) => {
          const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
          return severityOrder[b.severity] - severityOrder[a.severity];
        })
        .slice(0, 5);

      topFindings.forEach((finding, i) => {
        output += `${i + 1}. **${finding.type}** (${finding.severity})\n`;
        output += `   - File: ${finding.file}:${finding.line}\n`;
        output += `   - ${finding.description}\n`;
        output += `   - Fix: ${finding.recommendation}\n\n`;
      });
    }

    return output;
  }

  /**
   * Format test suggestions
   */
  private formatTestSuggestions(suggestions: GeneratedTestSuggestions): string {
    const emoji = this.useEmojis ? '🧪 ' : '';
    let output = `## ${emoji}Test Suggestions\n\n`;

    output += `**Total Suggestions:** ${suggestions.totalSuggestions}\n`;
    output += `- Unit Tests: ${suggestions.unitTests.length}\n`;
    output += `- Integration Tests: ${suggestions.integrationTests.length}\n`;
    output += `- E2E Tests: ${suggestions.e2eTests.length}\n\n`;

    if (suggestions.estimatedCoverageImprovement) {
      output += `**Estimated Coverage Improvement:** +${suggestions.estimatedCoverageImprovement}%\n\n`;
    }

    // Show top unit tests
    if (suggestions.unitTests.length > 0) {
      output += '### Unit Tests\n\n';
      suggestions.unitTests.slice(0, 3).forEach((test, i) => {
        output += `${i + 1}. ${test.description}\n`;
        output += `   - Priority: ${'⭐'.repeat(test.priority)}\n`;
        output += `   - ${test.scenario}\n`;
        if (test.codeSnippet) {
          output += '\n```typescript\n';
          output += test.codeSnippet.split('\n').slice(0, 10).join('\n');
          output += '\n```\n';
        }
        output += '\n';
      });
    }

    // Show integration tests if any
    if (suggestions.integrationTests.length > 0) {
      output += '### Integration Tests\n\n';
      suggestions.integrationTests.slice(0, 2).forEach((test, i) => {
        output += `${i + 1}. ${test.description}\n`;
        output += `   - ${test.scenario}\n\n`;
      });
    }

    return output;
  }

  /**
   * Format footer with next steps
   */
  private formatFooter(risk: RiskAssessment): string {
    let output = '---\n\n';
    output += '## Next Steps\n\n';

    if (risk.overallRisk === 'HIGH') {
      output += '1. ⚠️ Address critical issues and security findings\n';
      output += '2. Consider splitting large changes\n';
      output += '3. Add comprehensive tests\n';
      output += '4. Schedule thorough code review\n';
      output += '5. Test in staging environment\n';
    } else if (risk.overallRisk === 'MEDIUM') {
      output += '1. Review security findings\n';
      output += '2. Add suggested tests\n';
      output += '3. Request code review\n';
      output += '4. Verify CI/CD passes\n';
    } else {
      output += '1. ✅ Review looks good!\n';
      output += '2. Add any suggested tests\n';
      output += '3. Request standard code review\n';
      output += '4. Merge when approved\n';
    }

    output += '\n';
    output += `**Estimated Review Time:** ${this.estimateReviewTime(risk)}\n`;

    return output;
  }

  /**
   * Get icon for risk factor
   */
  private getFactorIcon(category: string): string {
    if (!this.useEmojis) return '-';

    const icons: Record<string, string> = {
      security: '🔒',
      complexity: '🧩',
      changeSize: '📦',
      criticalFiles: '🔴',
    };

    return icons[category] || '•';
  }

  /**
   * Capitalize first letter
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Estimate review time
   */
  private estimateReviewTime(risk: RiskAssessment): string {
    if (risk.overallScore >= 75) {
      return '2-4 hours (thorough review required)';
    } else if (risk.overallScore >= 40) {
      return '1-2 hours (careful review recommended)';
    } else {
      return '30-60 minutes (standard review)';
    }
  }

  /**
   * Format compact summary (for quick view)
   */
  formatCompact(result: PRAnalysisResult): string {
    const riskEmoji = getRiskEmoji(result.risk.overallRisk);
    let output = `${riskEmoji} **Risk:** ${result.risk.overallRisk} (${Math.round(result.risk.overallScore)}/100)\n`;
    output += `📊 **Changes:** ${result.diff.totalFiles} files, +${result.diff.totalAdditions} -${result.diff.totalDeletions}\n`;
    
    if (result.security.totalFindings > 0) {
      output += `🔒 **Security:** ${result.security.totalFindings} issue(s)`;
      if (result.security.hasCriticalIssues) {
        output += ' (CRITICAL)';
      }
      output += '\n';
    }

    if (result.prTitle) {
      output += `\n**Title:** ${result.prTitle.title}\n`;
    }

    return output;
  }
}

/**
 * Create an OutputFormatter instance
 */
export function createOutputFormatter(): OutputFormatter {
  return new OutputFormatter();
}

// Made with Bob