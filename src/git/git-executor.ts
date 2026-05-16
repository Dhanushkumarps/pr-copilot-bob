import { exec } from 'child_process';
import { promisify } from 'util';
import {
  GitCommandOptions,
  GitCommandResult,
  GitRepoInfo,
} from '../types/git.types';
import {
  GitError,
  NotAGitRepoError,
  GitCommandError,
} from '../utils/errors';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

/**
 * Default timeout for git commands (30 seconds)
 */
const DEFAULT_TIMEOUT = 30000;

/**
 * Maximum buffer size for git command output (10MB)
 */
const MAX_BUFFER = 10 * 1024 * 1024;

/**
 * GitExecutor class for safely executing git commands
 */
export class GitExecutor {
  private cwd: string;

  constructor(cwd?: string) {
    this.cwd = cwd || process.cwd();
  }

  /**
   * Check if directory is a git repository
   */
  async isGitRepository(): Promise<boolean> {
    try {
      const result = await this.execute('git rev-parse --git-dir', {
        cwd: this.cwd,
      });
      return result.exitCode === 0;
    } catch {
      return false;
    }
  }

  /**
   * Ensure we're in a git repository
   */
  private async ensureGitRepository(): Promise<void> {
    const isRepo = await this.isGitRepository();
    if (!isRepo) {
      throw new NotAGitRepoError(this.cwd);
    }
  }

  /**
   * Get git repository root directory
   */
  async getRepositoryRoot(): Promise<string> {
    await this.ensureGitRepository();
    const result = await this.execute('git rev-parse --show-toplevel');
    return result.stdout.trim();
  }

  /**
   * Execute a git command safely
   */
  async execute(
    command: string,
    options: GitCommandOptions = {}
  ): Promise<GitCommandResult> {
    const cwd = options.cwd || this.cwd;
    const timeout = options.timeout || DEFAULT_TIMEOUT;
    const env = { ...process.env, ...options.env };

    logger.debug(`Executing git command: ${command}`, 'GitExecutor', { cwd });

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd,
        timeout,
        maxBuffer: MAX_BUFFER,
        env,
      });

      return {
        stdout: stdout || '',
        stderr: stderr || '',
        exitCode: 0,
        command,
      };
    } catch (error: any) {
      const exitCode = error.code || 1;
      const stderr = error.stderr || error.message || '';
      const stdout = error.stdout || '';

      logger.error(
        `Git command failed: ${command}`,
        'GitExecutor',
        { exitCode, stderr: stderr.substring(0, 200) }
      );

      // Return result for non-zero exit codes (some commands use them for status)
      if (error.code !== undefined) {
        return {
          stdout,
          stderr,
          exitCode,
          command,
        };
      }

      throw new GitCommandError(command, exitCode, stderr, { cwd });
    }
  }

  /**
   * Get current branch name
   */
  async getCurrentBranch(): Promise<string> {
    await this.ensureGitRepository();
    const result = await this.execute('git rev-parse --abbrev-ref HEAD');
    
    if (result.exitCode !== 0) {
      throw new GitError('Failed to get current branch', {
        stderr: result.stderr,
      });
    }

    return result.stdout.trim();
  }

  /**
   * Get remote URL
   */
  async getRemoteUrl(remote: string = 'origin'): Promise<string | undefined> {
    await this.ensureGitRepository();
    const result = await this.execute(`git remote get-url ${remote}`);
    
    if (result.exitCode !== 0) {
      return undefined;
    }

    return result.stdout.trim();
  }

  /**
   * Check if working directory is clean
   */
  async isWorkingDirectoryClean(): Promise<boolean> {
    await this.ensureGitRepository();
    const result = await this.execute('git status --porcelain');
    return result.stdout.trim().length === 0;
  }

  /**
   * Get list of untracked files
   */
  async getUntrackedFiles(): Promise<string[]> {
    await this.ensureGitRepository();
    const result = await this.execute('git ls-files --others --exclude-standard');
    
    if (result.exitCode !== 0) {
      return [];
    }

    return result.stdout
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }

  /**
   * Get repository information
   */
  async getRepoInfo(): Promise<GitRepoInfo> {
    await this.ensureGitRepository();

    const [rootDir, currentBranch, remoteUrl, isClean, untrackedFiles] =
      await Promise.all([
        this.getRepositoryRoot(),
        this.getCurrentBranch(),
        this.getRemoteUrl(),
        this.isWorkingDirectoryClean(),
        this.getUntrackedFiles(),
      ]);

    return {
      rootDir,
      currentBranch,
      remoteUrl,
      isClean,
      untrackedFiles,
    };
  }

  /**
   * Get diff between commits/branches
   */
  async getDiff(
    base?: string,
    head?: string,
    options: { staged?: boolean; includeUntracked?: boolean } = {}
  ): Promise<string> {
    await this.ensureGitRepository();

    let command = 'git diff';

    if (options.staged) {
      command += ' --staged';
    }

    if (base && head) {
      command += ` ${base}..${head}`;
    } else if (base) {
      command += ` ${base}`;
    }

    // Add unified diff format with more context
    command += ' --unified=3';

    const result = await this.execute(command);

    if (result.exitCode !== 0 && result.exitCode !== 1) {
      throw new GitError('Failed to get diff', {
        stderr: result.stderr,
        exitCode: result.exitCode,
      });
    }

    return result.stdout;
  }

  /**
   * Get diff stat (summary of changes)
   */
  async getDiffStat(base?: string, head?: string): Promise<string> {
    await this.ensureGitRepository();

    let command = 'git diff --stat';

    if (base && head) {
      command += ` ${base}..${head}`;
    } else if (base) {
      command += ` ${base}`;
    }

    const result = await this.execute(command);

    if (result.exitCode !== 0 && result.exitCode !== 1) {
      throw new GitError('Failed to get diff stat', {
        stderr: result.stderr,
      });
    }

    return result.stdout;
  }

  /**
   * Get list of changed files
   */
  async getChangedFiles(
    base?: string,
    head?: string,
    options: { staged?: boolean } = {}
  ): Promise<string[]> {
    await this.ensureGitRepository();

    let command = 'git diff --name-only';

    if (options.staged) {
      command += ' --staged';
    }

    if (base && head) {
      command += ` ${base}..${head}`;
    } else if (base) {
      command += ` ${base}`;
    }

    const result = await this.execute(command);

    if (result.exitCode !== 0 && result.exitCode !== 1) {
      throw new GitError('Failed to get changed files', {
        stderr: result.stderr,
      });
    }

    return result.stdout
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }

  /**
   * Get commit hash
   */
  async getCommitHash(ref: string = 'HEAD'): Promise<string> {
    await this.ensureGitRepository();
    const result = await this.execute(`git rev-parse ${ref}`);

    if (result.exitCode !== 0) {
      throw new GitError(`Failed to get commit hash for ${ref}`, {
        stderr: result.stderr,
      });
    }

    return result.stdout.trim();
  }

  /**
   * Check if a branch exists
   */
  async branchExists(branch: string): Promise<boolean> {
    await this.ensureGitRepository();
    const result = await this.execute(`git rev-parse --verify ${branch}`);
    return result.exitCode === 0;
  }

  /**
   * Get file content at specific commit
   */
  async getFileContent(filePath: string, ref: string = 'HEAD'): Promise<string> {
    await this.ensureGitRepository();
    const result = await this.execute(`git show ${ref}:${filePath}`);

    if (result.exitCode !== 0) {
      throw new GitError(`Failed to get file content: ${filePath} at ${ref}`, {
        stderr: result.stderr,
      });
    }

    return result.stdout;
  }
}

/**
 * Create a GitExecutor instance
 */
export function createGitExecutor(cwd?: string): GitExecutor {
  return new GitExecutor(cwd);
}

// Made with Bob