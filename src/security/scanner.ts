import {
  SecurityFinding,
  SecurityScanResult,
  SecurityScanOptions,
  SecurityPattern,
  SecurityIssueType,
  SEVERITY_PRIORITY,
} from '../types/security.types';
import { FileDiff, GitDiffResult } from '../types/git.types';
import {
  isFalsePositive,
  getActivePatternsForFile,
} from './patterns';
import { logger } from '../utils/logger';

/**
 * SecurityScanner class for scanning code for security issues
 */
export class SecurityScanner {
  constructor(customPatterns?: SecurityPattern[]) {
    // Custom patterns can be passed but are merged in filterPatterns method
    if (customPatterns) {
      // Store for later use if needed
    }
  }

  /**
   * Scan git diff result for security issues
   */
  async scanDiff(
    diffResult: GitDiffResult,
    options: SecurityScanOptions = {}
  ): Promise<SecurityScanResult> {
    logger.info('Starting security scan', 'SecurityScanner', {
      totalFiles: diffResult.totalFiles,
    });

    const startTime = Date.now();
    const findings: SecurityFinding[] = [];

    // Scan each file in the diff
    for (const file of diffResult.files) {
      if (file.binary) {
        logger.debug(`Skipping binary file: ${file.path}`, 'SecurityScanner');
        continue;
      }

      const fileFindings = await this.scanFile(file, options);
      findings.push(...fileFindings);
    }

    // Apply filters
    const filteredFindings = this.applyFilters(findings, options);

    // Sort by severity (highest first)
    filteredFindings.sort((a, b) => {
      return SEVERITY_PRIORITY[b.severity] - SEVERITY_PRIORITY[a.severity];
    });

    // Calculate statistics
    const bySeverity = {
      critical: filteredFindings.filter(f => f.severity === 'CRITICAL').length,
      high: filteredFindings.filter(f => f.severity === 'HIGH').length,
      medium: filteredFindings.filter(f => f.severity === 'MEDIUM').length,
      low: filteredFindings.filter(f => f.severity === 'LOW').length,
    };

    const byType: Record<SecurityIssueType, number> = {} as any;
    for (const finding of filteredFindings) {
      byType[finding.type] = (byType[finding.type] || 0) + 1;
    }

    const scanDurationMs = Date.now() - startTime;

    logger.info('Security scan complete', 'SecurityScanner', {
      totalFindings: filteredFindings.length,
      critical: bySeverity.critical,
      high: bySeverity.high,
      durationMs: scanDurationMs,
    });

    return {
      findings: filteredFindings,
      totalFindings: filteredFindings.length,
      bySeverity,
      byType,
      filesScanned: diffResult.totalFiles,
      hasCriticalIssues: bySeverity.critical > 0,
      scanDurationMs,
    };
  }

  /**
   * Scan a single file for security issues
   */
  private async scanFile(
    file: FileDiff,
    options: SecurityScanOptions
  ): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    // Get active patterns for this file
    const activePatterns = getActivePatternsForFile(file.path);

    // Filter by custom options
    const patternsToUse = this.filterPatterns(activePatterns, options);

    // Extract added lines (only scan new code)
    const addedLines = this.extractAddedLines(file);

    // Scan each line
    for (let i = 0; i < addedLines.length; i++) {
      const line = addedLines[i];
      if (!line) continue;
      
      const { lineNumber, content } = line;

      for (const pattern of patternsToUse) {
        const matches = this.findMatches(content, pattern);

        for (const match of matches) {
          // Check for false positives
          if (isFalsePositive(match.value)) {
            logger.debug(
              `Skipping false positive: ${match.value}`,
              'SecurityScanner'
            );
            continue;
          }

          // Create finding
          const finding: SecurityFinding = {
            type: pattern.type,
            severity: pattern.severity,
            file: file.path,
            line: lineNumber,
            column: match.index,
            content: match.value,
            pattern: pattern.regex.source,
            description: pattern.description,
            recommendation: pattern.recommendation,
            confidence: pattern.confidence,
          };

          // Add context if requested
          if (options.includeContext) {
            finding.context = this.getContext(
              addedLines,
              i,
              options.contextLines || 2
            );
          }

          findings.push(finding);
        }
      }
    }

    return findings;
  }

  /**
   * Extract added lines from file diff
   */
  private extractAddedLines(
    file: FileDiff
  ): Array<{ lineNumber: number; content: string }> {
    const addedLines: Array<{ lineNumber: number; content: string }> = [];

    for (const hunk of file.hunks) {
      for (const change of hunk.changes) {
        if (change.type === 'addition') {
          addedLines.push({
            lineNumber: change.lineNumber,
            content: change.content,
          });
        }
      }
    }

    return addedLines;
  }

  /**
   * Find matches in content using pattern
   */
  private findMatches(
    content: string,
    pattern: SecurityPattern
  ): Array<{ value: string; index: number }> {
    const matches: Array<{ value: string; index: number }> = [];
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);

    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      matches.push({
        value: match[0],
        index: match.index,
      });

      // Prevent infinite loop for zero-width matches
      if (match.index === regex.lastIndex) {
        regex.lastIndex++;
      }
    }

    return matches;
  }

  /**
   * Get context lines around a finding
   */
  private getContext(
    lines: Array<{ lineNumber: number; content: string }>,
    currentIndex: number,
    contextLines: number
  ): { before: string[]; after: string[] } {
    const before: string[] = [];
    const after: string[] = [];

    // Get lines before
    for (let i = Math.max(0, currentIndex - contextLines); i < currentIndex; i++) {
      const line = lines[i];
      if (line) before.push(line.content);
    }

    // Get lines after
    for (
      let i = currentIndex + 1;
      i < Math.min(lines.length, currentIndex + contextLines + 1);
      i++
    ) {
      const line = lines[i];
      if (line) after.push(line.content);
    }

    return { before, after };
  }

  /**
   * Filter patterns based on options
   */
  private filterPatterns(
    patterns: SecurityPattern[],
    options: SecurityScanOptions
  ): SecurityPattern[] {
    let filtered = patterns;

    // Add custom patterns
    if (options.customPatterns) {
      filtered = [...filtered, ...options.customPatterns];
    }

    // Exclude types
    if (options.excludeTypes && options.excludeTypes.length > 0) {
      filtered = filtered.filter(
        p => !options.excludeTypes!.includes(p.type)
      );
    }

    // Filter by minimum severity
    if (options.minSeverity) {
      const minPriority = SEVERITY_PRIORITY[options.minSeverity];
      filtered = filtered.filter(
        p => SEVERITY_PRIORITY[p.severity] >= minPriority
      );
    }

    return filtered;
  }

  /**
   * Apply filters to findings
   */
  private applyFilters(
    findings: SecurityFinding[],
    options: SecurityScanOptions
  ): SecurityFinding[] {
    let filtered = findings;

    // Filter by minimum severity
    if (options.minSeverity) {
      const minPriority = SEVERITY_PRIORITY[options.minSeverity];
      filtered = filtered.filter(
        f => SEVERITY_PRIORITY[f.severity] >= minPriority
      );
    }

    // Limit number of findings
    if (options.maxFindings && options.maxFindings > 0) {
      filtered = filtered.slice(0, options.maxFindings);
    }

    return filtered;
  }

  /**
   * Scan raw content (not from diff)
   */
  async scanContent(
    content: string,
    filePath: string,
    options: SecurityScanOptions = {}
  ): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    // Get active patterns for this file
    const activePatterns = getActivePatternsForFile(filePath);

    // Filter by custom options
    const patternsToUse = this.filterPatterns(activePatterns, options);

    // Split content into lines
    const lines = content.split('\n');

    // Scan each line
    for (let i = 0; i < lines.length; i++) {
      const lineContent = lines[i];
      if (!lineContent) continue;
      
      const lineNumber = i + 1;

      for (const pattern of patternsToUse) {
        const matches = this.findMatches(lineContent, pattern);

        for (const match of matches) {
          // Check for false positives
          if (isFalsePositive(match.value)) {
            continue;
          }

          // Create finding
          const finding: SecurityFinding = {
            type: pattern.type,
            severity: pattern.severity,
            file: filePath,
            line: lineNumber,
            column: match.index,
            content: match.value,
            pattern: pattern.regex.source,
            description: pattern.description,
            recommendation: pattern.recommendation,
            confidence: pattern.confidence,
          };

          // Add context if requested
          if (options.includeContext) {
            finding.context = {
              before: lines.slice(
                Math.max(0, i - (options.contextLines || 2)),
                i
              ),
              after: lines.slice(
                i + 1,
                Math.min(lines.length, i + (options.contextLines || 2) + 1)
              ),
            };
          }

          findings.push(finding);
        }
      }
    }

    return this.applyFilters(findings, options);
  }

  /**
   * Get summary of findings by severity
   */
  getSeveritySummary(findings: SecurityFinding[]): Record<string, number> {
    return {
      CRITICAL: findings.filter(f => f.severity === 'CRITICAL').length,
      HIGH: findings.filter(f => f.severity === 'HIGH').length,
      MEDIUM: findings.filter(f => f.severity === 'MEDIUM').length,
      LOW: findings.filter(f => f.severity === 'LOW').length,
    };
  }

  /**
   * Get summary of findings by type
   */
  getTypeSummary(findings: SecurityFinding[]): Record<SecurityIssueType, number> {
    const summary: Record<SecurityIssueType, number> = {} as any;

    for (const finding of findings) {
      summary[finding.type] = (summary[finding.type] || 0) + 1;
    }

    return summary;
  }

  /**
   * Check if scan result has critical issues
   */
  hasCriticalIssues(result: SecurityScanResult): boolean {
    return result.bySeverity.critical > 0;
  }

  /**
   * Get high confidence findings (confidence >= 0.8)
   */
  getHighConfidenceFindings(findings: SecurityFinding[]): SecurityFinding[] {
    return findings.filter(f => f.confidence >= 0.8);
  }

  /**
   * Format findings for display
   */
  formatFindings(findings: SecurityFinding[]): string {
    if (findings.length === 0) {
      return '✅ No security issues found';
    }

    let output = `🔒 Security Issues Found: ${findings.length}\n\n`;

    for (const finding of findings) {
      const icon = this.getSeverityIcon(finding.severity);
      output += `${icon} ${finding.severity} - ${finding.type}\n`;
      output += `   File: ${finding.file}:${finding.line}\n`;
      output += `   Issue: ${finding.description}\n`;
      output += `   Fix: ${finding.recommendation}\n`;
      output += `   Confidence: ${(finding.confidence * 100).toFixed(0)}%\n\n`;
    }

    return output;
  }

  /**
   * Get icon for severity level
   */
  private getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'CRITICAL':
        return '🔴';
      case 'HIGH':
        return '🟠';
      case 'MEDIUM':
        return '🟡';
      case 'LOW':
        return '🔵';
      default:
        return '⚪';
    }
  }
}

/**
 * Create a SecurityScanner instance
 */
export function createSecurityScanner(
  customPatterns?: SecurityPattern[]
): SecurityScanner {
  return new SecurityScanner(customPatterns);
}

// Made with Bob