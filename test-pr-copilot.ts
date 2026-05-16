#!/usr/bin/env ts-node

/**
 * Simple demo test script for PR Copilot
 * 
 * This script demonstrates the basic functionality without requiring
 * actual git changes or IBM watsonx.ai credentials.
 */

import { DiffAnalyzer } from './src/git/diff-analyzer';
import { SecurityScanner } from './src/security/scanner';
import { RiskAssessor } from './src/risk/assessor';
import { OutputFormatter } from './src/formatters/output-formatter';
import { GitDiffResult } from './src/types/git.types';

console.log('🚀 PR Copilot Demo Test\n');
console.log('=' .repeat(50));
console.log('\nThis demo shows PR Copilot functionality without');
console.log('requiring actual git changes or API credentials.\n');

// Create mock diff data
const mockDiff: GitDiffResult = {
  files: [
    {
      path: 'src/index.ts',
      oldPath: 'src/index.ts',
      status: 'modified',
      additions: 45,
      deletions: 12,
      binary: false,
      language: 'typescript',
      hunks: [
        {
          oldStart: 1,
          oldLines: 20,
          newStart: 1,
          newLines: 25,
          header: '@@ -1,20 +1,25 @@',
          changes: [
            {
              type: 'addition',
              lineNumber: 5,
              content: 'import { PRCopilot } from "./pr-copilot";',
            },
            {
              type: 'addition',
              lineNumber: 10,
              content: 'const copilot = new PRCopilot();',
            },
          ],
        },
      ],
    },
    {
      path: 'src/config.ts',
      status: 'added',
      additions: 30,
      deletions: 0,
      binary: false,
      language: 'typescript',
      hunks: [
        {
          oldStart: 0,
          oldLines: 0,
          newStart: 1,
          newLines: 30,
          header: '@@ -0,0 +1,30 @@',
          changes: [
            {
              type: 'addition',
              lineNumber: 5,
              content: 'const API_KEY = "sk-1234567890abcdef";',
            },
          ],
        },
      ],
    },
    {
      path: 'package.json',
      status: 'modified',
      additions: 3,
      deletions: 1,
      binary: false,
      hunks: [],
    },
  ],
  totalFiles: 3,
  totalAdditions: 78,
  totalDeletions: 13,
  baseBranch: 'main',
  hasUncommittedChanges: false,
};

async function runDemo() {
  try {
    console.log('Step 1: Analyzing diff...');
    const analyzer = new DiffAnalyzer();
    const changeSummary = analyzer.getChangeSummary(mockDiff);
    console.log(`✓ Found ${changeSummary.modified.length} modified, ${changeSummary.added.length} added files`);
    console.log(`✓ Critical files: ${changeSummary.criticalFiles.length}`);

    console.log('\nStep 2: Running security scan...');
    const scanner = new SecurityScanner();
    const securityResult = await scanner.scanDiff(mockDiff);
    console.log(`✓ Security scan complete: ${securityResult.totalFindings} findings`);
    if (securityResult.hasCriticalIssues) {
      console.log('⚠️  Critical security issues detected!');
    }

    console.log('\nStep 3: Calculating risk score...');
    const assessor = new RiskAssessor();
    const riskAssessment = await assessor.assessRisk(
      mockDiff,
      changeSummary,
      securityResult
    );
    console.log(`✓ Overall Risk: ${riskAssessment.overallRisk} (${Math.round(riskAssessment.overallScore)}/100)`);

    console.log('\nStep 4: Formatting output...');
    const formatter = new OutputFormatter();
    const output = formatter.formatComplete({
      diff: mockDiff,
      changeSummary,
      security: securityResult,
      risk: riskAssessment,
    });

    console.log('\n' + '='.repeat(50));
    console.log('\n📄 FORMATTED OUTPUT:\n');
    console.log(output);

    console.log('\n' + '='.repeat(50));
    console.log('\n✅ Demo completed successfully!');
    console.log('\nTo test with real git changes:');
    console.log('1. Set up your .env file with IBM credentials');
    console.log('2. Make some git changes');
    console.log('3. Run: node dist/index.js\n');

  } catch (error) {
    console.error('\n❌ Demo failed:', error);
    if (error instanceof Error) {
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run the demo
runDemo();

// Made with Bob
