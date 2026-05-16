/**
 * Test script for Git Diff Analyzer
 * 
 * This script tests the git diff analyzer functionality by:
 * 1. Checking if we're in a git repository
 * 2. Analyzing the current git diff
 * 3. Displaying the results
 * 4. Running a security scan on the changes
 */

import { createDiffAnalyzer } from './src/git/diff-analyzer';
import { createSecurityScanner } from './src/security/scanner';
import { initializeLogger, LogLevel } from './src/utils/logger';

async function testDiffAnalyzer() {
  // Initialize logger
  initializeLogger({
    level: LogLevel.INFO,
    consoleEnabled: true,
    fileEnabled: false,
    colorsEnabled: true,
  });

  console.log('🔍 Testing Git Diff Analyzer\n');
  console.log('=' .repeat(60));

  try {
    // Create analyzer instance
    const analyzer = createDiffAnalyzer();

    // Test 1: Analyze current changes
    console.log('\n📊 Test 1: Analyzing current git diff...\n');
    
    const diffResult = await analyzer.analyzeDiff({
      includeUntracked: false,
      stagedOnly: false,
    });

    // Display results
    console.log(`✅ Analysis complete!`);
    console.log(`\n📈 Summary:`);
    console.log(`   Total files changed: ${diffResult.totalFiles}`);
    console.log(`   Total additions: ${diffResult.totalAdditions}`);
    console.log(`   Total deletions: ${diffResult.totalDeletions}`);
    console.log(`   Has uncommitted changes: ${diffResult.hasUncommittedChanges}`);

    if (diffResult.baseBranch) {
      console.log(`   Base branch: ${diffResult.baseBranch}`);
    }

    // Display file details
    if (diffResult.files.length > 0) {
      console.log(`\n📁 Changed files:`);
      for (const file of diffResult.files) {
        const statusIcon = getStatusIcon(file.status);
        console.log(`   ${statusIcon} ${file.path}`);
        console.log(`      Status: ${file.status}`);
        console.log(`      +${file.additions} -${file.deletions}`);
        if (file.language) {
          console.log(`      Language: ${file.language}`);
        }
        if (file.binary) {
          console.log(`      ⚠️  Binary file`);
        }
      }

      // Test 2: Get change summary
      console.log(`\n📋 Test 2: Getting change summary...\n`);
      const summary = analyzer.getChangeSummary(diffResult);

      console.log(`✅ Summary generated!`);
      if (summary.added.length > 0) {
        console.log(`\n   ➕ Added files (${summary.added.length}):`);
        summary.added.forEach(f => console.log(`      - ${f}`));
      }
      if (summary.modified.length > 0) {
        console.log(`\n   ✏️  Modified files (${summary.modified.length}):`);
        summary.modified.forEach(f => console.log(`      - ${f}`));
      }
      if (summary.deleted.length > 0) {
        console.log(`\n   ❌ Deleted files (${summary.deleted.length}):`);
        summary.deleted.forEach(f => console.log(`      - ${f}`));
      }
      if (summary.criticalFiles.length > 0) {
        console.log(`\n   🔴 Critical files (${summary.criticalFiles.length}):`);
        summary.criticalFiles.forEach(f => console.log(`      - ${f}`));
      }
      if (summary.testFiles.length > 0) {
        console.log(`\n   🧪 Test files (${summary.testFiles.length}):`);
        summary.testFiles.forEach(f => console.log(`      - ${f}`));
      }
      if (summary.configFiles.length > 0) {
        console.log(`\n   ⚙️  Config files (${summary.configFiles.length}):`);
        summary.configFiles.forEach(f => console.log(`      - ${f}`));
      }

      // Test 3: Security scan
      console.log(`\n🔒 Test 3: Running security scan...\n`);
      const scanner = createSecurityScanner();
      const scanResult = await scanner.scanDiff(diffResult, {
        minSeverity: 'LOW',
        includeContext: true,
        contextLines: 2,
      });

      console.log(`✅ Security scan complete!`);
      console.log(`\n🔍 Security findings:`);
      console.log(`   Total findings: ${scanResult.totalFindings}`);
      console.log(`   Critical: ${scanResult.bySeverity.critical}`);
      console.log(`   High: ${scanResult.bySeverity.high}`);
      console.log(`   Medium: ${scanResult.bySeverity.medium}`);
      console.log(`   Low: ${scanResult.bySeverity.low}`);

      if (scanResult.findings.length > 0) {
        console.log(`\n⚠️  Security issues found:\n`);
        console.log(scanner.formatFindings(scanResult.findings));
      } else {
        console.log(`\n✅ No security issues found!`);
      }

      // Test 4: File metadata
      console.log(`\n📝 Test 4: Analyzing file metadata...\n`);
      for (const file of diffResult.files.slice(0, 3)) {
        const metadata = analyzer.getFileMetadata(file.path);
        console.log(`   File: ${file.path}`);
        console.log(`      Extension: ${metadata.extension}`);
        console.log(`      Language: ${metadata.language || 'unknown'}`);
        console.log(`      Critical: ${metadata.isCritical ? '🔴 Yes' : '⚪ No'}`);
        console.log(`      Test file: ${metadata.isTest ? '🧪 Yes' : '⚪ No'}`);
        console.log(`      Config: ${metadata.isConfig ? '⚙️  Yes' : '⚪ No'}`);
        console.log();
      }

    } else {
      console.log(`\n⚠️  No changes detected in the working directory.`);
      console.log(`   Make some changes to test the diff analyzer.`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests completed successfully!\n');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    if (error.code === 'NOT_A_GIT_REPO') {
      console.error('\n💡 Make sure you run this test from a git repository.');
    } else if (error.code === 'NO_CHANGES') {
      console.error('\n💡 No changes detected. Make some changes and try again.');
    }
    console.error('\n' + '='.repeat(60));
    process.exit(1);
  }
}

/**
 * Get icon for file status
 */
function getStatusIcon(status: string): string {
  switch (status) {
    case 'added':
      return '➕';
    case 'modified':
      return '✏️ ';
    case 'deleted':
      return '❌';
    case 'renamed':
      return '📝';
    default:
      return '📄';
  }
}

// Run the test
testDiffAnalyzer().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});

// Made with Bob