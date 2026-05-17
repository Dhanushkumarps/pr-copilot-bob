import {
  GitDiffResult,
  FileDiff,
  DiffHunk,
  DiffChange,
  ChangeType,
  DiffAnalysisOptions,
  FileMetadata,
  ChangeSummary,
  LANGUAGE_EXTENSIONS,
  CRITICAL_FILE_PATTERNS,
  TEST_FILE_PATTERNS,
  CONFIG_FILE_PATTERNS,
} from '../types/git.types';
import { GitExecutor } from './git-executor';
import { NoChangesError } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * DiffAnalyzer class for parsing and analyzing git diffs
 */
export class DiffAnalyzer {
  private gitExecutor: GitExecutor;

  constructor(cwd?: string) {
    this.gitExecutor = new GitExecutor(cwd);
  }

  /**
   * Analyze git diff and return structured result
   */
  async analyzeDiff(options: DiffAnalysisOptions = {}): Promise<GitDiffResult> {
    logger.info('Starting diff analysis', 'DiffAnalyzer', { options });

    const startTime = Date.now();

    // Get diff content
    const diffContent = await this.getDiffContent(options);

    if (!diffContent || diffContent.trim().length === 0) {
      throw new NoChangesError(options.baseBranch);
    }

    // Parse diff into structured format
    const files = this.parseDiff(diffContent);

    // Apply filters if specified
    const filteredFiles = this.applyFilters(files, options);

    // Get commit information
    const baseCommit = options.baseBranch
      ? await this.getCommitHash(options.baseBranch)
      : undefined;
    const headCommit = await this.getCommitHash('HEAD');

    // Check for uncommitted changes
    const hasUncommittedChanges = !(await this.gitExecutor.isWorkingDirectoryClean());

    // Calculate totals
    const totalAdditions = filteredFiles.reduce((sum, f) => sum + f.additions, 0);
    const totalDeletions = filteredFiles.reduce((sum, f) => sum + f.deletions, 0);

    const result: GitDiffResult = {
      files: filteredFiles,
      totalFiles: filteredFiles.length,
      totalAdditions,
      totalDeletions,
      baseBranch: options.baseBranch,
      baseCommit,
      headCommit,
      hasUncommittedChanges,
    };

    const duration = Date.now() - startTime;
    logger.info('Diff analysis complete', 'DiffAnalyzer', {
      totalFiles: result.totalFiles,
      totalAdditions,
      totalDeletions,
      durationMs: duration,
    });

    return result;
  }

  /**
   * Get diff content based on options
   */
  private async getDiffContent(options: DiffAnalysisOptions): Promise<string> {
    const { baseBranch, stagedOnly } = options;

    let diffContent = '';

    if (stagedOnly) {
      // Get staged changes only
      console.log('🔍 Running: git diff --cached (staged changes)');
      diffContent = await this.gitExecutor.getDiff(undefined, undefined, {
        staged: true,
      });
    } else {
      // Try multiple strategies to find changes
      
      // Strategy 1: Try staged changes first (git diff --cached)
      console.log('🔍 Running: git diff --cached (staged changes)');
      diffContent = await this.gitExecutor.getDiff(undefined, undefined, {
        staged: true,
      });

      // Strategy 2: If no staged changes, try uncommitted changes (git diff HEAD)
      if (!diffContent || diffContent.trim().length === 0) {
        console.log('🔍 No staged changes. Running: git diff HEAD (uncommitted changes)');
        diffContent = await this.gitExecutor.getDiff('HEAD');
      }

      // Strategy 3: If no HEAD changes, try against base branch (git diff main)
      if (!diffContent || diffContent.trim().length === 0) {
        const branch = baseBranch || 'main';
        console.log(`🔍 No HEAD changes. Running: git diff ${branch} (branch comparison)`);
        
        // Check if base branch exists before comparing
        const branchExists = await this.gitExecutor.branchExists(branch);
        if (branchExists) {
          diffContent = await this.gitExecutor.getDiff(branch, 'HEAD');
        } else {
          console.log(`⚠️  Branch '${branch}' does not exist, skipping branch comparison`);
        }
      }
    }

    // TODO: Handle untracked files if includeUntracked is true
    // This would require additional logic to read and format untracked files

    return diffContent;
  }

  /**
   * Parse git diff output into structured format
   */
  private parseDiff(diffContent: string): FileDiff[] {
    const files: FileDiff[] = [];
    const lines = diffContent.split('\n');

    let currentFile: Partial<FileDiff> | null = null;
    let currentHunk: Partial<DiffHunk> | null = null;
    let oldLineNumber = 0;
    let newLineNumber = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      // File header: diff --git a/path b/path
      if (line.startsWith('diff --git ')) {
        // Save previous file if exists
        if (currentFile && currentHunk) {
          currentFile.hunks!.push(currentHunk as DiffHunk);
          files.push(currentFile as FileDiff);
        }

        // Start new file
        currentFile = {
          path: '',
          status: 'modified',
          additions: 0,
          deletions: 0,
          binary: false,
          hunks: [],
        };
        currentHunk = null;
      }
      // Old file path: --- a/path or --- /dev/null
      else if (line.startsWith('--- ')) {
        if (currentFile) {
          const match = line.match(/^--- a\/(.+)$/);
          if (match) {
            currentFile.oldPath = match[1];
          } else if (line === '--- /dev/null') {
            currentFile.status = 'added';
          }
        }
      }
      // New file path: +++ b/path or +++ /dev/null
      else if (line.startsWith('+++ ')) {
        if (currentFile) {
          const match = line.match(/^\+\+\+ b\/(.+)$/);
          if (match && match[1]) {
            currentFile.path = match[1];
            currentFile.language = this.detectLanguage(match[1]);
          } else if (line === '+++ /dev/null') {
            currentFile.status = 'deleted';
            currentFile.path = currentFile.oldPath || '';
          }
        }
      }
      // Binary file marker
      else if (line.startsWith('Binary files ')) {
        if (currentFile) {
          currentFile.binary = true;
        }
      }
      // Hunk header: @@ -1,5 +1,7 @@
      else if (line.startsWith('@@')) {
        // Save previous hunk if exists
        if (currentFile && currentHunk) {
          currentFile.hunks!.push(currentHunk as DiffHunk);
        }

        const match = line.match(/^@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);
        if (match && match[1] && match[3]) {
          oldLineNumber = parseInt(match[1], 10);
          const oldLines = match[2] ? parseInt(match[2], 10) : 1;
          newLineNumber = parseInt(match[3], 10);
          const newLines = match[4] ? parseInt(match[4], 10) : 1;

          currentHunk = {
            oldStart: oldLineNumber,
            oldLines,
            newStart: newLineNumber,
            newLines,
            header: line,
            changes: [],
          };
        }
      }
      // Change lines
      else if (currentHunk && (line.startsWith('+') || line.startsWith('-') || line.startsWith(' '))) {
        let type: ChangeType;
        let content: string;

        if (line.startsWith('+')) {
          type = 'addition';
          content = line.substring(1);
          if (currentFile) currentFile.additions!++;
          const change: DiffChange = {
            lineNumber: newLineNumber,
            type,
            content,
          };
          currentHunk.changes!.push(change);
          newLineNumber++;
        } else if (line.startsWith('-')) {
          type = 'deletion';
          content = line.substring(1);
          if (currentFile) currentFile.deletions!++;
          const change: DiffChange = {
            lineNumber: newLineNumber,
            type,
            content,
            oldLineNumber,
          };
          currentHunk.changes!.push(change);
          oldLineNumber++;
        } else {
          type = 'context';
          content = line.substring(1);
          const change: DiffChange = {
            lineNumber: newLineNumber,
            type,
            content,
            oldLineNumber,
          };
          currentHunk.changes!.push(change);
          oldLineNumber++;
          newLineNumber++;
        }
      }
    }

    // Save last file
    if (currentFile && currentHunk) {
      currentFile.hunks!.push(currentHunk as DiffHunk);
      files.push(currentFile as FileDiff);
    }

    return files;
  }

  /**
   * Apply filters to file list
   */
  private applyFilters(
    files: FileDiff[],
    options: DiffAnalysisOptions
  ): FileDiff[] {
    let filtered = files;

    // Filter by include patterns
    if (options.includePatterns && options.includePatterns.length > 0) {
      filtered = filtered.filter(file =>
        options.includePatterns!.some(pattern =>
          this.matchGlobPattern(file.path, pattern)
        )
      );
    }

    // Filter by exclude patterns
    if (options.excludePatterns && options.excludePatterns.length > 0) {
      filtered = filtered.filter(
        file =>
          !options.excludePatterns!.some(pattern =>
            this.matchGlobPattern(file.path, pattern)
          )
      );
    }

    // Limit lines per file
    if (options.maxLinesPerFile && options.maxLinesPerFile > 0) {
      filtered = filtered.map(file => {
        const totalLines = file.additions + file.deletions;
        if (totalLines > options.maxLinesPerFile!) {
          logger.warn(
            `File ${file.path} exceeds max lines (${totalLines} > ${options.maxLinesPerFile})`,
            'DiffAnalyzer'
          );
          // Truncate hunks to fit within limit
          return this.truncateFileDiff(file, options.maxLinesPerFile!);
        }
        return file;
      });
    }

    return filtered;
  }

  /**
   * Truncate file diff to maximum number of lines
   */
  private truncateFileDiff(file: FileDiff, maxLines: number): FileDiff {
    const truncated = { ...file };
    truncated.hunks = [];
    let lineCount = 0;

    for (const hunk of file.hunks) {
      const hunkLines = hunk.changes.length;
      if (lineCount + hunkLines <= maxLines) {
        truncated.hunks.push(hunk);
        lineCount += hunkLines;
      } else {
        // Add partial hunk
        const remainingLines = maxLines - lineCount;
        if (remainingLines > 0) {
          const partialHunk = {
            ...hunk,
            changes: hunk.changes.slice(0, remainingLines),
          };
          truncated.hunks.push(partialHunk);
        }
        break;
      }
    }

    return truncated;
  }

  /**
   * Simple glob pattern matching
   */
  private matchGlobPattern(path: string, pattern: string): boolean {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }

  /**
   * Detect programming language from file extension
   */
  private detectLanguage(filePath: string): string | undefined {
    const ext = filePath.substring(filePath.lastIndexOf('.'));
    
    for (const [language, extensions] of Object.entries(LANGUAGE_EXTENSIONS)) {
      if (extensions.includes(ext)) {
        return language;
      }
    }

    return undefined;
  }

  /**
   * Get file metadata
   */
  getFileMetadata(filePath: string): FileMetadata {
    const ext = filePath.substring(filePath.lastIndexOf('.'));
    const language = this.detectLanguage(filePath);
    
    const isCritical = CRITICAL_FILE_PATTERNS.some(pattern =>
      pattern.test(filePath)
    );
    const isTest = TEST_FILE_PATTERNS.some(pattern => pattern.test(filePath));
    const isConfig = CONFIG_FILE_PATTERNS.some(pattern =>
      pattern.test(filePath)
    );

    return {
      path: filePath,
      extension: ext,
      language,
      isCritical,
      isTest,
      isConfig,
    };
  }

  /**
   * Get change summary
   */
  getChangeSummary(diffResult: GitDiffResult): ChangeSummary {
    const summary: ChangeSummary = {
      added: [],
      modified: [],
      deleted: [],
      renamed: [],
      criticalFiles: [],
      testFiles: [],
      configFiles: [],
    };

    for (const file of diffResult.files) {
      const metadata = this.getFileMetadata(file.path);

      // Categorize by status
      switch (file.status) {
        case 'added':
          summary.added.push(file.path);
          break;
        case 'deleted':
          summary.deleted.push(file.path);
          break;
        case 'renamed':
          summary.renamed.push({
            from: file.oldPath || '',
            to: file.path,
          });
          break;
        case 'modified':
        default:
          summary.modified.push(file.path);
          break;
      }

      // Categorize by type
      if (metadata.isCritical) {
        summary.criticalFiles.push(file.path);
      }
      if (metadata.isTest) {
        summary.testFiles.push(file.path);
      }
      if (metadata.isConfig) {
        summary.configFiles.push(file.path);
      }
    }

    return summary;
  }

  /**
   * Get commit hash
   */
  private async getCommitHash(ref: string): Promise<string | undefined> {
    try {
      return await this.gitExecutor.getCommitHash(ref);
    } catch {
      return undefined;
    }
  }

  /**
   * Get added lines from diff result
   */
  getAddedLines(diffResult: GitDiffResult): string[] {
    const addedLines: string[] = [];

    for (const file of diffResult.files) {
      for (const hunk of file.hunks) {
        for (const change of hunk.changes) {
          if (change.type === 'addition') {
            addedLines.push(change.content);
          }
        }
      }
    }

    return addedLines;
  }

  /**
   * Get deleted lines from diff result
   */
  getDeletedLines(diffResult: GitDiffResult): string[] {
    const deletedLines: string[] = [];

    for (const file of diffResult.files) {
      for (const hunk of file.hunks) {
        for (const change of hunk.changes) {
          if (change.type === 'deletion') {
            deletedLines.push(change.content);
          }
        }
      }
    }

    return deletedLines;
  }

  /**
   * Check if diff contains specific file
   */
  containsFile(diffResult: GitDiffResult, filePath: string): boolean {
    return diffResult.files.some(file => file.path === filePath);
  }

  /**
   * Get file diff by path
   */
  getFileDiff(diffResult: GitDiffResult, filePath: string): FileDiff | undefined {
    return diffResult.files.find(file => file.path === filePath);
  }
}

/**
 * Create a DiffAnalyzer instance
 */
export function createDiffAnalyzer(cwd?: string): DiffAnalyzer {
  return new DiffAnalyzer(cwd);
}

// Made with Bob