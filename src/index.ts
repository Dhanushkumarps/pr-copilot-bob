#!/usr/bin/env node

import { GitExecutor } from './git/git-executor';
import { DiffAnalyzer } from './git/diff-analyzer';
import { SecurityScanner } from './security/scanner';
import { GraniteClient } from './ai/granite-client';
import { PRGenerator } from './generators/pr-generator';
import { TestGenerator } from './generators/test-generator';
import { RiskAssessor } from './risk/assessor';
import { OutputFormatter, PRAnalysisResult } from './formatters/output-formatter';
import { getConfig } from './utils/config';
import { logger } from './utils/logger';
import { PRCopilotError, GitError, NoChangesError, AIError } from './utils/errors';
import { GitDiffResult, ChangeSummary } from './types/git.types';
import { SecurityScanResult } from './types/security.types';
import {
  GeneratedPRTitle,
  GeneratedPRDescription,
  GeneratedTestSuggestions,
} from './types/ai.types';

/**
 * Main PR Copilot class that orchestrates the entire workflow
 */
export class PRCopilot {
  private gitExecutor: GitExecutor;
  private diffAnalyzer: DiffAnalyzer;
  private securityScanner: SecurityScanner;
  private graniteClient: GraniteClient;
  private prGenerator: PRGenerator;
  private testGenerator: TestGenerator;
  private riskAssessor: RiskAssessor;
  private outputFormatter: OutputFormatter;

  constructor() {
    const config = getConfig();

    this.gitExecutor = new GitExecutor();
    this.diffAnalyzer = new DiffAnalyzer();
    this.securityScanner = new SecurityScanner();
    this.graniteClient = new GraniteClient({
      apiKey: config.ibm.apiKey,
      projectId: config.ibm.projectId,
      url: config.ibm.url,
    });
    this.prGenerator = new PRGenerator(this.graniteClient);
    this.testGenerator = new TestGenerator(this.graniteClient);
    this.riskAssessor = new RiskAssessor();
    this.outputFormatter = new OutputFormatter();
  }

  /**
   * Main entry point - analyze PR and generate comprehensive report
   */
  async analyzePR(options: {
    baseBranch?: string;
    skipAI?: boolean;
    skipTests?: boolean;
    verbose?: boolean;
  } = {}): Promise<string> {
    const startTime = Date.now();
    logger.info('Starting PR analysis...', 'PRCopilot');

    try {
      // Step 1: Get git diff
      logger.info('Step 1/6: Getting git diff...', 'PRCopilot');
      const diffResult = await this.getGitDiff(options.baseBranch);
      logger.info('Git diff retrieved', 'PRCopilot', {
        files: diffResult.totalFiles,
        additions: diffResult.totalAdditions,
        deletions: diffResult.totalDeletions,
      });

      // Step 2: Analyze diff
      logger.info('Step 2/6: Analyzing changes...', 'PRCopilot');
      const changeSummary = this.diffAnalyzer.getChangeSummary(diffResult);
      logger.info('Changes analyzed', 'PRCopilot', {
        added: changeSummary.added.length,
        modified: changeSummary.modified.length,
        deleted: changeSummary.deleted.length,
        critical: changeSummary.criticalFiles.length,
      });

      // Step 3: Security scan
      logger.info('Step 3/6: Running security scan...', 'PRCopilot');
      const securityResult = await this.runSecurityScan(diffResult);
      logger.info('Security scan complete', 'PRCopilot', {
        findings: securityResult.totalFindings,
        critical: securityResult.hasCriticalIssues,
      });

      // Step 4: Risk assessment
      logger.info('Step 4/6: Calculating risk score...', 'PRCopilot');
      const riskAssessment = await this.riskAssessor.assessRisk(
        diffResult,
        changeSummary,
        securityResult
      );
      logger.info('Risk assessment complete', 'PRCopilot', {
        risk: riskAssessment.overallRisk,
        score: Math.round(riskAssessment.overallScore),
      });

      // Step 5: Generate PR content (if not skipped)
      let prTitle: GeneratedPRTitle | undefined;
      let prDescription: GeneratedPRDescription | undefined;

      if (!options.skipAI) {
        logger.info('Step 5/6: Generating PR content with AI...', 'PRCopilot');
        try {
          const prContent = await this.generatePRContent(
            diffResult,
            changeSummary,
            securityResult
          );
          prTitle = prContent.title;
          prDescription = prContent.description;
          logger.info('PR content generated', 'PRCopilot', {
            title: prTitle.title,
            conventional: prTitle.isConventional,
          });
        } catch (error) {
          logger.warn('Failed to generate PR content, continuing without it', 'PRCopilot', {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      } else {
        logger.info('Step 5/6: Skipping AI-generated PR content', 'PRCopilot');
      }

      // Step 6: Generate test suggestions (if not skipped)
      let testSuggestions: GeneratedTestSuggestions | undefined;

      if (!options.skipAI && !options.skipTests) {
        logger.info('Step 6/6: Generating test suggestions...', 'PRCopilot');
        try {
          testSuggestions = await this.generateTestSuggestions(diffResult);
          logger.info('Test suggestions generated', 'PRCopilot', {
            total: testSuggestions.totalSuggestions,
            unit: testSuggestions.unitTests.length,
            integration: testSuggestions.integrationTests.length,
          });
        } catch (error) {
          logger.warn('Failed to generate test suggestions, continuing without them', 'PRCopilot', {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      } else {
        logger.info('Step 6/6: Skipping test suggestions', 'PRCopilot');
      }

      // Format and return results
      const result: PRAnalysisResult = {
        diff: diffResult,
        changeSummary,
        security: securityResult,
        risk: riskAssessment,
        prTitle,
        prDescription,
        testSuggestions,
      };

      const output = this.outputFormatter.formatComplete(result);
      
      const duration = Date.now() - startTime;
      logger.info('PR analysis complete', 'PRCopilot', {
        duration: `${(duration / 1000).toFixed(2)}s`,
        risk: riskAssessment.overallRisk,
      });

      return output;
    } catch (error) {
      logger.error('PR analysis failed', 'PRCopilot', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      if (error instanceof PRCopilotError) {
        throw error;
      }

      throw new PRCopilotError(
        'Failed to analyze PR',
        'UNKNOWN_ERROR',
        { originalError: error }
      );
    }
  }

  /**
   * Get git diff for current changes
   */
  private async getGitDiff(baseBranch?: string): Promise<GitDiffResult> {
    try {
      // Check if we're in a git repository
      const isRepo = await this.gitExecutor.isGitRepository();
      if (!isRepo) {
        throw new GitError(
          'Not a git repository. Please run this command from within a git repository.'
        );
      }

      // Get current branch
      const currentBranch = await this.gitExecutor.getCurrentBranch();
      logger.debug('Current branch', 'PRCopilot', { branch: currentBranch });

      // Determine base branch
      let base = baseBranch;
      if (!base) {
        // Use default from config
        const config = getConfig();
        base = config.git.defaultBranch;
        logger.debug('Using default base branch', 'PRCopilot', { base });
      }

      // Get diff using DiffAnalyzer
      const diffResult = await this.diffAnalyzer.analyzeDiff({
        baseBranch: base,
      });

      if (diffResult.totalFiles === 0) {
        throw new NoChangesError(base);
      }

      return diffResult;
    } catch (error) {
      if (error instanceof PRCopilotError) {
        throw error;
      }

      throw new GitError(
        'Failed to get git diff',
        { originalError: error }
      );
    }
  }

  /**
   * Run security scan on diff
   */
  private async runSecurityScan(
    diffResult: GitDiffResult
  ): Promise<SecurityScanResult> {
    try {
      return await this.securityScanner.scanDiff(diffResult);
    } catch (error) {
      logger.error('Security scan failed', 'PRCopilot', {
        error: error instanceof Error ? error.message : String(error),
      });

      // Return empty result on failure - don't block the entire analysis
      return {
        findings: [],
        totalFindings: 0,
        bySeverity: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
        },
        byType: {} as Record<string, number>,
        filesScanned: 0,
        hasCriticalIssues: false,
        scanDurationMs: 0,
      };
    }
  }

  /**
   * Generate PR title and description
   */
  private async generatePRContent(
    diffResult: GitDiffResult,
    changeSummary: ChangeSummary,
    securityResult: SecurityScanResult
  ): Promise<{
    title: GeneratedPRTitle;
    description: GeneratedPRDescription;
  }> {
    try {
      const [title, description] = await Promise.all([
        this.prGenerator.generateTitle(diffResult, changeSummary),
        this.prGenerator.generateDescription(
          diffResult,
          changeSummary,
          securityResult
        ),
      ]);

      return { title, description };
    } catch (error) {
      throw new AIError(
        'Failed to generate PR content',
        { originalError: error }
      );
    }
  }

  /**
   * Generate test suggestions
   */
  private async generateTestSuggestions(
    diffResult: GitDiffResult
  ): Promise<GeneratedTestSuggestions> {
    try {
      return await this.testGenerator.generateTestSuggestions(diffResult);
    } catch (error) {
      throw new AIError(
        'Failed to generate test suggestions',
        { originalError: error }
      );
    }
  }

  /**
   * Get quick summary (compact format)
   */
  async getQuickSummary(baseBranch?: string): Promise<string> {
    try {
      const diffResult = await this.getGitDiff(baseBranch);
      const changeSummary = this.diffAnalyzer.getChangeSummary(diffResult);
      const securityResult = await this.runSecurityScan(diffResult);
      const riskAssessment = await this.riskAssessor.assessRisk(
        diffResult,
        changeSummary,
        securityResult
      );

      const result: PRAnalysisResult = {
        diff: diffResult,
        changeSummary,
        security: securityResult,
        risk: riskAssessment,
      };

      return this.outputFormatter.formatCompact(result);
    } catch (error) {
      throw new PRCopilotError(
        'Failed to get quick summary',
        'UNKNOWN_ERROR',
        { originalError: error }
      );
    }
  }
}

/**
 * CLI entry point
 */
async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const options: {
      baseBranch?: string;
      skipAI?: boolean;
      skipTests?: boolean;
      verbose?: boolean;
      quick?: boolean;
    } = {};

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      if (arg === '--base' || arg === '-b') {
        options.baseBranch = args[++i];
      } else if (arg === '--skip-ai') {
        options.skipAI = true;
      } else if (arg === '--skip-tests') {
        options.skipTests = true;
      } else if (arg === '--verbose' || arg === '-v') {
        options.verbose = true;
      } else if (arg === '--quick' || arg === '-q') {
        options.quick = true;
      } else if (arg === '--help' || arg === '-h') {
        printHelp();
        process.exit(0);
      }
    }

    // Create copilot instance
    const copilot = new PRCopilot();

    // Run analysis
    let output: string;
    if (options.quick) {
      output = await copilot.getQuickSummary(options.baseBranch);
    } else {
      output = await copilot.analyzePR(options);
    }

    // Print output
    console.log(output);

    process.exit(0);
  } catch (error) {
    if (error instanceof PRCopilotError) {
      console.error(`\n❌ Error: ${error.message}\n`);
      if (error.context && error.context['originalError']) {
        const origError = error.context['originalError'] as Error;
        console.error(`Cause: ${origError.message}\n`);
      }
      process.exit(1);
    }

    console.error('\n❌ Unexpected error:', error);
    process.exit(1);
  }
}

/**
 * Print help message
 */
function printHelp() {
  console.log(`
PR Copilot - AI-powered PR analysis tool

Usage:
  pr-copilot [options]

Options:
  -b, --base <branch>    Base branch to compare against (default: main)
  --skip-ai              Skip AI-generated content
  --skip-tests           Skip test suggestions
  -q, --quick            Quick summary only (no AI)
  -v, --verbose          Verbose logging
  -h, --help             Show this help message

Examples:
  pr-copilot                           # Full analysis against main
  pr-copilot --base develop            # Compare against develop branch
  pr-copilot --quick                   # Quick summary only
  pr-copilot --skip-tests              # Skip test suggestions

Environment Variables:
  IBM_CLOUD_API_KEY         IBM Cloud API key (required)
  IBM_WATSONX_PROJECT_ID    IBM watsonx.ai project ID (required)
  IBM_WATSONX_URL           IBM watsonx.ai service URL (optional)
  LOG_LEVEL                 Logging level: ERROR, WARN, INFO, DEBUG (default: INFO)
  OUTPUT_EMOJIS             Use emojis in output: true/false (default: true)
  OUTPUT_COLORS             Use colors in output: true/false (default: true)
`);
}

// Run CLI if this is the main module
if (require.main === module) {
  main();
}

// Export for programmatic use
export type { PRAnalysisResult } from './formatters/output-formatter';
export type { GitDiffResult, ChangeSummary } from './types/git.types';
export type { SecurityScanResult } from './types/security.types';
export type { RiskAssessment } from './types/risk.types';
export type {
  GeneratedPRTitle,
  GeneratedPRDescription,
  GeneratedTestSuggestions,
} from './types/ai.types';

// Made with Bob