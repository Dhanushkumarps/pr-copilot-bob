/**
 * Base error class for PR Copilot
 */
export class PRCopilotError extends Error {
  constructor(
    message: string,
    public code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    // Capture stack trace if available (Node.js)
    if (typeof (Error as any).captureStackTrace === 'function') {
      (Error as any).captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to JSON for logging
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      stack: this.stack,
    };
  }
}

/**
 * Git-related errors
 */
export class GitError extends PRCopilotError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'GIT_ERROR', context);
  }
}

/**
 * Error when not in a git repository
 */
export class NotAGitRepoError extends GitError {
  constructor(directory: string) {
    super(`Not a git repository: ${directory}`, { directory });
    this.code = 'NOT_A_GIT_REPO';
  }
}

/**
 * Error when no changes are detected
 */
export class NoChangesError extends GitError {
  constructor(branch?: string) {
    super(
      branch
        ? `No changes detected compared to ${branch}`
        : 'No changes detected in working directory',
      { branch }
    );
    this.code = 'NO_CHANGES';
  }
}

/**
 * Error when git command fails
 */
export class GitCommandError extends GitError {
  constructor(
    command: string,
    exitCode: number,
    stderr: string,
    context?: Record<string, unknown>
  ) {
    super(`Git command failed: ${command}`, {
      command,
      exitCode,
      stderr,
      ...context,
    });
    this.code = 'GIT_COMMAND_FAILED';
  }
}

/**
 * Security-related errors
 */
export class SecurityError extends PRCopilotError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'SECURITY_ERROR', context);
  }
}

/**
 * Error when critical security issues are found
 */
export class CriticalSecurityError extends SecurityError {
  constructor(
    public readonly findings: Array<{
      type: string;
      file: string;
      line: number;
    }>
  ) {
    super(
      `Critical security issues found: ${findings.length} issue(s)`,
      { findings }
    );
    this.code = 'CRITICAL_SECURITY_ISSUES';
  }
}

/**
 * AI-related errors
 */
export class AIError extends PRCopilotError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'AI_ERROR', context);
  }
}

/**
 * Error when AI authentication fails
 */
export class AuthenticationError extends AIError {
  constructor(provider: string, details?: string) {
    super(
      `Authentication failed for ${provider}${details ? `: ${details}` : ''}`,
      { provider, details }
    );
    this.code = 'AI_AUTH_FAILED';
  }
}

/**
 * Error when AI rate limit is exceeded
 */
export class RateLimitError extends AIError {
  constructor(
    provider: string,
    public readonly retryAfter?: number
  ) {
    super(`Rate limit exceeded for ${provider}`, {
      provider,
      retryAfter,
    });
    this.code = 'AI_RATE_LIMIT';
  }
}

/**
 * Error when AI request times out
 */
export class TimeoutError extends AIError {
  constructor(
    operation: string,
    public readonly timeoutMs: number
  ) {
    super(`Operation timed out: ${operation} (${timeoutMs}ms)`, {
      operation,
      timeoutMs,
    });
    this.code = 'AI_TIMEOUT';
  }
}

/**
 * Error when AI response is invalid
 */
export class InvalidResponseError extends AIError {
  constructor(reason: string, response?: unknown) {
    super(`Invalid AI response: ${reason}`, { reason, response });
    this.code = 'AI_INVALID_RESPONSE';
  }
}

/**
 * Configuration-related errors
 */
export class ConfigError extends PRCopilotError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'CONFIG_ERROR', context);
  }
}

/**
 * Error when required environment variable is missing
 */
export class MissingEnvVarError extends ConfigError {
  constructor(public readonly varName: string) {
    super(`Missing required environment variable: ${varName}`, { varName });
    this.code = 'MISSING_ENV_VAR';
  }
}

/**
 * Error when configuration is invalid
 */
export class InvalidConfigError extends ConfigError {
  constructor(field: string, reason: string, value?: unknown) {
    super(`Invalid configuration for ${field}: ${reason}`, {
      field,
      reason,
      value,
    });
    this.code = 'INVALID_CONFIG';
  }
}

/**
 * Validation-related errors
 */
export class ValidationError extends PRCopilotError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', context);
  }
}

/**
 * Error when input is invalid
 */
export class InvalidInputError extends ValidationError {
  constructor(field: string, reason: string, value?: unknown) {
    super(`Invalid input for ${field}: ${reason}`, {
      field,
      reason,
      value,
    });
    this.code = 'INVALID_INPUT';
  }
}

/**
 * Error when state is invalid
 */
export class InvalidStateError extends ValidationError {
  constructor(state: string, reason: string) {
    super(`Invalid state: ${state} - ${reason}`, { state, reason });
    this.code = 'INVALID_STATE';
  }
}

/**
 * Type guard to check if error is a PRCopilotError
 */
export function isPRCopilotError(error: unknown): error is PRCopilotError {
  return error instanceof PRCopilotError;
}

/**
 * Type guard to check if error is a GitError
 */
export function isGitError(error: unknown): error is GitError {
  return error instanceof GitError;
}

/**
 * Type guard to check if error is a SecurityError
 */
export function isSecurityError(error: unknown): error is SecurityError {
  return error instanceof SecurityError;
}

/**
 * Type guard to check if error is an AIError
 */
export function isAIError(error: unknown): error is AIError {
  return error instanceof AIError;
}

/**
 * Type guard to check if error is a ConfigError
 */
export function isConfigError(error: unknown): error is ConfigError {
  return error instanceof ConfigError;
}

/**
 * Type guard to check if error is a ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

/**
 * Get user-friendly error message with recovery suggestions
 */
export function getErrorMessage(error: unknown): string {
  if (isPRCopilotError(error)) {
    return formatPRCopilotError(error);
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

/**
 * Format PRCopilotError with recovery suggestions
 */
function formatPRCopilotError(error: PRCopilotError): string {
  let message = `❌ ${error.message}\n`;

  // Add recovery suggestions based on error type
  if (error instanceof NotAGitRepoError) {
    message += '\n💡 Make sure you are in a git repository directory.';
    message += '\n   Run: git init (to initialize a new repository)';
  } else if (error instanceof NoChangesError) {
    message += '\n💡 Make some changes to your code and try again.';
    message += '\n   Or specify a different branch to compare against.';
  } else if (error instanceof MissingEnvVarError) {
    message += `\n💡 Set the ${error.varName} environment variable in your .env file.`;
    message += '\n   Copy .env.example to .env and fill in the values.';
  } else if (error instanceof AuthenticationError) {
    message += '\n💡 Check your IBM Cloud API key and project ID.';
    message += '\n   Get your API key from: https://cloud.ibm.com/iam/apikeys';
  } else if (error instanceof RateLimitError) {
    message += '\n💡 You have exceeded the API rate limit.';
    if (error.retryAfter) {
      message += `\n   Please wait ${error.retryAfter} seconds before trying again.`;
    }
  } else if (error instanceof TimeoutError) {
    message += '\n💡 The operation took too long to complete.';
    message += '\n   Try again or increase the timeout in your configuration.';
  } else if (error instanceof CriticalSecurityError) {
    message += '\n💡 Fix the security issues before creating a PR.';
    message += '\n   Remove hardcoded secrets and use environment variables.';
  }

  return message;
}

/**
 * Wrap async function with error handling
 */
export function withErrorHandling<T>(
  fn: () => Promise<T>,
  context?: string
): Promise<T> {
  return fn().catch((error: unknown) => {
    if (isPRCopilotError(error)) {
      throw error;
    }

    // Wrap unknown errors in PRCopilotError
    const message = error instanceof Error ? error.message : String(error);
    throw new PRCopilotError(
      context ? `${context}: ${message}` : message,
      'UNKNOWN_ERROR',
      { originalError: error }
    );
  });
}

// Made with Bob
