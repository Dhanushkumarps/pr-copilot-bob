import { GitDiffResult, ChangeSummary } from '../types/git.types';
import { SecurityScanResult } from '../types/security.types';
import {
  GeneratedPRTitle,
  GeneratedPRDescription,
  PRTitleContext,
  PRDescriptionContext,
  AIGenerationOptions,
} from '../types/ai.types';
import { GraniteClient, getGraniteClient } from '../ai/granite-client';
import {
  buildPRTitlePrompt,
  buildPRDescriptionPrompt,
  validateTitle,
  parseConventionalTitle,
  PR_TITLE_PROMPT,
  PR_DESCRIPTION_PROMPT,
} from '../ai/prompts';
import { logger } from '../utils/logger';
import { AIError } from '../utils/errors';

/**
 * PRGenerator class for generating PR titles and descriptions
 */
export class PRGenerator {
  private client: GraniteClient;

  constructor(client?: GraniteClient) {
    this.client = client || getGraniteClient();
  }

  /**
   * Generate PR title from git diff
   */
  async generateTitle(
    diffResult: GitDiffResult,
    changeSummary: ChangeSummary,
    options?: AIGenerationOptions
  ): Promise<GeneratedPRTitle> {
    logger.info('Generating PR title', 'PRGenerator', {
      totalFiles: diffResult.totalFiles,
    });

    try {
      // Build context
      const context = this.buildTitleContext(diffResult, changeSummary);

      // Build prompt
      const prompt = buildPRTitlePrompt(context);

      // Generate with AI
      const result = await this.client.generate(prompt, {
        ...PR_TITLE_PROMPT.defaultParams,
        ...options,
      });

      // Clean and validate title
      let title = result.text.trim();
      
      // Remove quotes if present
      title = title.replace(/^["']|["']$/g, '');
      
      // Remove any trailing punctuation except for scope closing parenthesis
      title = title.replace(/[.!?]+$/, '');

      // Validate title
      const validation = validateTitle(title);
      if (!validation.valid) {
        logger.warn('Generated title validation failed', 'PRGenerator', {
          title,
          errors: validation.errors,
        });
      }

      // Parse conventional commit format
      const parsed = parseConventionalTitle(title);

      logger.info('PR title generated successfully', 'PRGenerator', {
        title,
        length: title.length,
        isConventional: parsed !== null,
      });

      return {
        title,
        type: parsed?.type,
        scope: parsed?.scope,
        isConventional: parsed !== null,
        length: title.length,
      };
    } catch (error: any) {
      logger.error('Failed to generate PR title', 'PRGenerator', {
        error: error.message,
      });
      throw new AIError('Failed to generate PR title', { cause: error });
    }
  }

  /**
   * Generate PR description from git diff
   */
  async generateDescription(
    diffResult: GitDiffResult,
    changeSummary: ChangeSummary,
    securityResult?: SecurityScanResult,
    options?: AIGenerationOptions
  ): Promise<GeneratedPRDescription> {
    logger.info('Generating PR description', 'PRGenerator', {
      totalFiles: diffResult.totalFiles,
      hasSecurityIssues: securityResult?.hasCriticalIssues || false,
    });

    try {
      // Build context
      const context = this.buildDescriptionContext(
        diffResult,
        changeSummary,
        securityResult
      );

      // Build prompt
      const prompt = buildPRDescriptionPrompt(context);

      // Generate with AI
      const result = await this.client.generate(prompt, {
        ...PR_DESCRIPTION_PROMPT.defaultParams,
        ...options,
      });

      // Parse description sections
      const description = this.parseDescription(result.text);

      logger.info('PR description generated successfully', 'PRGenerator', {
        sections: Object.keys(description).length,
      });

      return description;
    } catch (error: any) {
      logger.error('Failed to generate PR description', 'PRGenerator', {
        error: error.message,
      });
      throw new AIError('Failed to generate PR description', { cause: error });
    }
  }

  /**
   * Generate complete PR (title + description)
   */
  async generatePR(
    diffResult: GitDiffResult,
    changeSummary: ChangeSummary,
    securityResult?: SecurityScanResult,
    options?: AIGenerationOptions
  ): Promise<{
    title: GeneratedPRTitle;
    description: GeneratedPRDescription;
  }> {
    logger.info('Generating complete PR', 'PRGenerator');

    const [title, description] = await Promise.all([
      this.generateTitle(diffResult, changeSummary, options),
      this.generateDescription(diffResult, changeSummary, securityResult, options),
    ]);

    return { title, description };
  }

  /**
   * Build title context from diff result
   */
  private buildTitleContext(
    diffResult: GitDiffResult,
    changeSummary: ChangeSummary
  ): PRTitleContext {
    // Get unique languages
    const languages = Array.from(
      new Set(
        diffResult.files
          .map(f => f.language)
          .filter((l): l is string => l !== undefined)
      )
    );

    // Determine main changes
    const mainChanges = this.summarizeMainChanges(changeSummary);

    return {
      files: diffResult.files.map(f => f.path),
      additions: diffResult.totalAdditions,
      deletions: diffResult.totalDeletions,
      mainChanges,
      languages,
    };
  }

  /**
   * Build description context from diff result
   */
  private buildDescriptionContext(
    diffResult: GitDiffResult,
    changeSummary: ChangeSummary,
    securityResult?: SecurityScanResult
  ): PRDescriptionContext {
    // Build file details
    const files = diffResult.files.map(f => ({
      path: f.path,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
    }));

    // Extract key changes (top 5 files by changes)
    const keyChanges = diffResult.files
      .sort((a, b) => b.additions + b.deletions - (a.additions + a.deletions))
      .slice(0, 5)
      .map(f => ({
        file: f.path,
        change: this.summarizeFileChanges(f),
      }));

    // Detect patterns
    const patterns = this.detectPatterns(changeSummary);

    // Format security issues
    const securityIssues = securityResult
      ? this.formatSecurityIssues(securityResult)
      : undefined;

    return {
      files,
      keyChanges,
      patterns,
      securityIssues,
    };
  }

  /**
   * Summarize main changes from change summary
   */
  private summarizeMainChanges(changeSummary: ChangeSummary): string {
    const parts: string[] = [];

    if (changeSummary.added.length > 0) {
      parts.push(`Added ${changeSummary.added.length} file(s)`);
    }
    if (changeSummary.modified.length > 0) {
      parts.push(`Modified ${changeSummary.modified.length} file(s)`);
    }
    if (changeSummary.deleted.length > 0) {
      parts.push(`Deleted ${changeSummary.deleted.length} file(s)`);
    }
    if (changeSummary.criticalFiles.length > 0) {
      parts.push(`${changeSummary.criticalFiles.length} critical file(s) affected`);
    }

    return parts.join(', ');
  }

  /**
   * Summarize changes in a single file
   */
  private summarizeFileChanges(file: any): string {
    const total = file.additions + file.deletions;
    return `${file.status}: +${file.additions} -${file.deletions} (${total} lines changed)`;
  }

  /**
   * Detect patterns in changes
   */
  private detectPatterns(changeSummary: ChangeSummary): string[] {
    const patterns: string[] = [];

    // Check for new features
    if (changeSummary.added.length > changeSummary.deleted.length) {
      patterns.push('New feature implementation');
    }

    // Check for refactoring
    if (
      changeSummary.modified.length > changeSummary.added.length &&
      changeSummary.deleted.length > 0
    ) {
      patterns.push('Code refactoring');
    }

    // Check for test changes
    if (changeSummary.testFiles.length > 0) {
      patterns.push(`Test coverage updates (${changeSummary.testFiles.length} test files)`);
    }

    // Check for config changes
    if (changeSummary.configFiles.length > 0) {
      patterns.push(`Configuration changes (${changeSummary.configFiles.length} config files)`);
    }

    // Check for documentation
    const docFiles = changeSummary.modified.filter(f =>
      f.match(/\.(md|txt|rst)$/i)
    );
    if (docFiles.length > 0) {
      patterns.push('Documentation updates');
    }

    return patterns.length > 0 ? patterns : ['General code changes'];
  }

  /**
   * Format security issues for description
   */
  private formatSecurityIssues(securityResult: SecurityScanResult): string[] {
    const issues: string[] = [];

    if (securityResult.bySeverity.critical > 0) {
      issues.push(
        `⚠️ ${securityResult.bySeverity.critical} CRITICAL security issue(s) found`
      );
    }
    if (securityResult.bySeverity.high > 0) {
      issues.push(
        `⚠️ ${securityResult.bySeverity.high} HIGH severity security issue(s) found`
      );
    }

    // Add top issue types
    const topTypes = Object.entries(securityResult.byType)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([type, count]) => `${type}: ${count}`);

    if (topTypes.length > 0) {
      issues.push(`Issue types: ${topTypes.join(', ')}`);
    }

    return issues;
  }

  /**
   * Parse generated description into sections
   */
  private parseDescription(text: string): GeneratedPRDescription {
    const sections: GeneratedPRDescription = {
      whatChanged: '',
      whyChanged: '',
      impact: '',
    };

    // Extract "What Changed" section
    const whatMatch = text.match(/##\s*What Changed\s*\n([\s\S]*?)(?=##|$)/i);
    if (whatMatch && whatMatch[1]) {
      sections.whatChanged = whatMatch[1].trim();
    }

    // Extract "Why" section
    const whyMatch = text.match(/##\s*Why\s*\n([\s\S]*?)(?=##|$)/i);
    if (whyMatch && whyMatch[1]) {
      sections.whyChanged = whyMatch[1].trim();
    }

    // Extract "Impact" section
    const impactMatch = text.match(/##\s*Impact\s*\n([\s\S]*?)(?=##|$)/i);
    if (impactMatch && impactMatch[1]) {
      sections.impact = impactMatch[1].trim();
    }

    // Extract breaking changes if mentioned
    const breakingMatch = text.match(/breaking change[s]?:?\s*\n?-?\s*(.+)/gi);
    if (breakingMatch) {
      sections.breakingChanges = breakingMatch.map(m =>
        m.replace(/breaking change[s]?:?\s*\n?-?\s*/i, '').trim()
      );
    }

    // If sections are empty, use the whole text
    if (!sections.whatChanged && !sections.whyChanged && !sections.impact) {
      sections.whatChanged = text;
    }

    return sections;
  }

  /**
   * Format PR as markdown
   */
  formatPRMarkdown(
    title: GeneratedPRTitle,
    description: GeneratedPRDescription
  ): string {
    let markdown = `# ${title.title}\n\n`;

    if (description.whatChanged) {
      markdown += `## What Changed\n\n${description.whatChanged}\n\n`;
    }

    if (description.whyChanged) {
      markdown += `## Why\n\n${description.whyChanged}\n\n`;
    }

    if (description.impact) {
      markdown += `## Impact\n\n${description.impact}\n\n`;
    }

    if (description.breakingChanges && description.breakingChanges.length > 0) {
      markdown += `## ⚠️ Breaking Changes\n\n`;
      description.breakingChanges.forEach(change => {
        markdown += `- ${change}\n`;
      });
      markdown += '\n';
    }

    if (description.relatedIssues && description.relatedIssues.length > 0) {
      markdown += `## Related Issues\n\n`;
      description.relatedIssues.forEach(issue => {
        markdown += `- ${issue}\n`;
      });
      markdown += '\n';
    }

    return markdown;
  }
}

/**
 * Create a PRGenerator instance
 */
export function createPRGenerator(client?: GraniteClient): PRGenerator {
  return new PRGenerator(client);
}

// Made with Bob