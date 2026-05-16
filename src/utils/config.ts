import * as dotenv from 'dotenv';
import { MissingEnvVarError, InvalidConfigError } from './errors';
import { LogLevel } from './logger';

// Load environment variables from .env file
dotenv.config();

/**
 * Application configuration interface
 */
export interface AppConfig {
  // IBM watsonx.ai configuration
  ibm: {
    apiKey: string;
    projectId: string;
    url: string;
  };

  // Granite model configuration
  granite: {
    modelId: string;
    maxTokens: number;
    temperature: number;
    topP: number;
  };

  // Security scanner configuration
  security: {
    enabled: boolean;
    minSeverity: 'LOW' | 'MEDIUM' | 'HIGH';
  };

  // Risk assessment configuration
  risk: {
    thresholds: {
      high: number;
      medium: number;
    };
    weights: {
      security: number;
      complexity: number;
      changeSize: number;
      criticalFiles: number;
    };
  };

  // Logging configuration
  logging: {
    level: LogLevel;
    file?: string;
    consoleEnabled: boolean;
    fileEnabled: boolean;
    colorsEnabled: boolean;
  };

  // Git configuration
  git: {
    defaultBranch: string;
    maxDiffLines: number;
  };

  // Performance configuration
  performance: {
    aiTimeoutMs: number;
    maxRetries: number;
    retryDelayMs: number;
  };

  // Feature flags
  features: {
    testSuggestions: boolean;
    testCodeSnippets: boolean;
    prDescription: boolean;
    riskAssessment: boolean;
  };

  // Output configuration
  output: {
    emojis: boolean;
    colors: boolean;
    maxTitleLength: number;
  };
}

/**
 * Get required environment variable
 */
function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new MissingEnvVarError(key);
  }
  return value;
}

/**
 * Get optional environment variable with default
 */
function getOptionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

/**
 * Get environment variable as number
 */
function getEnvAsNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;

  const parsed = Number(value);
  if (isNaN(parsed)) {
    throw new InvalidConfigError(key, 'must be a valid number', value);
  }

  return parsed;
}

/**
 * Get environment variable as boolean
 */
function getEnvAsBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;

  const lower = value.toLowerCase();
  if (lower === 'true' || lower === '1' || lower === 'yes') {
    return true;
  }
  if (lower === 'false' || lower === '0' || lower === 'no') {
    return false;
  }

  throw new InvalidConfigError(key, 'must be a boolean value', value);
}

/**
 * Validate log level
 */
function validateLogLevel(level: string): LogLevel {
  const validLevels = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
  const upper = level.toUpperCase();

  if (!validLevels.includes(upper)) {
    throw new InvalidConfigError(
      'LOG_LEVEL',
      `must be one of: ${validLevels.join(', ')}`,
      level
    );
  }

  return upper as LogLevel;
}

/**
 * Validate severity level
 */
function validateSeverity(severity: string): 'LOW' | 'MEDIUM' | 'HIGH' {
  const validSeverities = ['LOW', 'MEDIUM', 'HIGH'];
  const upper = severity.toUpperCase();

  if (!validSeverities.includes(upper)) {
    throw new InvalidConfigError(
      'SECURITY_MIN_SEVERITY',
      `must be one of: ${validSeverities.join(', ')}`,
      severity
    );
  }

  return upper as 'LOW' | 'MEDIUM' | 'HIGH';
}

/**
 * Validate risk weights sum to 1.0
 */
function validateRiskWeights(weights: {
  security: number;
  complexity: number;
  changeSize: number;
  criticalFiles: number;
}): void {
  const sum = weights.security + weights.complexity + weights.changeSize + weights.criticalFiles;
  const tolerance = 0.001; // Allow small floating point errors

  if (Math.abs(sum - 1.0) > tolerance) {
    throw new InvalidConfigError(
      'RISK_WEIGHTS',
      `weights must sum to 1.0 (current sum: ${sum})`,
      weights
    );
  }
}

/**
 * Load and validate application configuration
 */
export function loadConfig(): AppConfig {
  // IBM watsonx.ai configuration
  const ibmApiKey = getRequiredEnv('IBM_CLOUD_API_KEY');
  const ibmProjectId = getRequiredEnv('IBM_WATSONX_PROJECT_ID');
  const ibmUrl = getOptionalEnv('IBM_WATSONX_URL', 'https://us-south.ml.cloud.ibm.com');

  // Granite model configuration
  const graniteModelId = getOptionalEnv('GRANITE_MODEL_ID', 'ibm/granite-13b-chat-v2');
  const graniteMaxTokens = getEnvAsNumber('GRANITE_MAX_TOKENS', 2048);
  const graniteTemperature = getEnvAsNumber('GRANITE_TEMPERATURE', 0.7);
  const graniteTopP = getEnvAsNumber('GRANITE_TOP_P', 0.95);

  // Validate Granite parameters
  if (graniteMaxTokens < 1 || graniteMaxTokens > 8192) {
    throw new InvalidConfigError(
      'GRANITE_MAX_TOKENS',
      'must be between 1 and 8192',
      graniteMaxTokens
    );
  }
  if (graniteTemperature < 0 || graniteTemperature > 1) {
    throw new InvalidConfigError(
      'GRANITE_TEMPERATURE',
      'must be between 0.0 and 1.0',
      graniteTemperature
    );
  }
  if (graniteTopP < 0 || graniteTopP > 1) {
    throw new InvalidConfigError(
      'GRANITE_TOP_P',
      'must be between 0.0 and 1.0',
      graniteTopP
    );
  }

  // Security configuration
  const securityEnabled = getEnvAsBoolean('SECURITY_SCAN_ENABLED', true);
  const securityMinSeverity = validateSeverity(
    getOptionalEnv('SECURITY_MIN_SEVERITY', 'MEDIUM')
  );

  // Risk assessment configuration
  const riskThresholdHigh = getEnvAsNumber('RISK_THRESHOLD_HIGH', 75);
  const riskThresholdMedium = getEnvAsNumber('RISK_THRESHOLD_MEDIUM', 40);

  if (riskThresholdMedium >= riskThresholdHigh) {
    throw new InvalidConfigError(
      'RISK_THRESHOLDS',
      'RISK_THRESHOLD_MEDIUM must be less than RISK_THRESHOLD_HIGH',
      { medium: riskThresholdMedium, high: riskThresholdHigh }
    );
  }

  const riskWeights = {
    security: getEnvAsNumber('RISK_WEIGHT_SECURITY', 0.4),
    complexity: getEnvAsNumber('RISK_WEIGHT_COMPLEXITY', 0.3),
    changeSize: getEnvAsNumber('RISK_WEIGHT_CHANGE_SIZE', 0.15),
    criticalFiles: getEnvAsNumber('RISK_WEIGHT_CRITICAL_FILES', 0.15),
  };
  validateRiskWeights(riskWeights);

  // Logging configuration
  const logLevel = validateLogLevel(getOptionalEnv('LOG_LEVEL', 'INFO'));
  const logFile = process.env['LOG_FILE'];
  const logConsole = getEnvAsBoolean('LOG_CONSOLE', true);
  const logFileEnabled = getEnvAsBoolean('LOG_FILE_ENABLED', true);

  // Git configuration
  const gitDefaultBranch = getOptionalEnv('GIT_DEFAULT_BRANCH', 'main');
  const gitMaxDiffLines = getEnvAsNumber('GIT_MAX_DIFF_LINES', 10000);

  // Performance configuration
  const aiTimeoutMs = getEnvAsNumber('AI_TIMEOUT_MS', 30000);
  const maxRetries = getEnvAsNumber('AI_MAX_RETRIES', 3);
  const retryDelayMs = getEnvAsNumber('AI_RETRY_DELAY_MS', 1000);

  // Feature flags
  const featureTestSuggestions = getEnvAsBoolean('FEATURE_TEST_SUGGESTIONS', true);
  const featureTestCodeSnippets = getEnvAsBoolean('FEATURE_TEST_CODE_SNIPPETS', true);
  const featurePrDescription = getEnvAsBoolean('FEATURE_PR_DESCRIPTION', true);
  const featureRiskAssessment = getEnvAsBoolean('FEATURE_RISK_ASSESSMENT', true);

  // Output configuration
  const outputEmojis = getEnvAsBoolean('OUTPUT_EMOJIS', true);
  const outputColors = getEnvAsBoolean('OUTPUT_COLORS', true);
  const outputMaxTitleLength = getEnvAsNumber('OUTPUT_MAX_TITLE_LENGTH', 72);

  return {
    ibm: {
      apiKey: ibmApiKey,
      projectId: ibmProjectId,
      url: ibmUrl,
    },
    granite: {
      modelId: graniteModelId,
      maxTokens: graniteMaxTokens,
      temperature: graniteTemperature,
      topP: graniteTopP,
    },
    security: {
      enabled: securityEnabled,
      minSeverity: securityMinSeverity,
    },
    risk: {
      thresholds: {
        high: riskThresholdHigh,
        medium: riskThresholdMedium,
      },
      weights: riskWeights,
    },
    logging: {
      level: logLevel,
      file: logFile,
      consoleEnabled: logConsole,
      fileEnabled: logFileEnabled,
      colorsEnabled: outputColors,
    },
    git: {
      defaultBranch: gitDefaultBranch,
      maxDiffLines: gitMaxDiffLines,
    },
    performance: {
      aiTimeoutMs,
      maxRetries,
      retryDelayMs,
    },
    features: {
      testSuggestions: featureTestSuggestions,
      testCodeSnippets: featureTestCodeSnippets,
      prDescription: featurePrDescription,
      riskAssessment: featureRiskAssessment,
    },
    output: {
      emojis: outputEmojis,
      colors: outputColors,
      maxTitleLength: outputMaxTitleLength,
    },
  };
}

/**
 * Cached configuration instance
 */
let cachedConfig: AppConfig | null = null;

/**
 * Get application configuration (cached)
 */
export function getConfig(): AppConfig {
  if (!cachedConfig) {
    cachedConfig = loadConfig();
  }
  return cachedConfig;
}

/**
 * Reset cached configuration (useful for testing)
 */
export function resetConfig(): void {
  cachedConfig = null;
}

/**
 * Get configuration value by path (dot notation)
 * Example: getConfigValue('ibm.apiKey')
 */
export function getConfigValue(path: string): unknown {
  const config = getConfig();
  const parts = path.split('.');
  let value: any = config;

  for (const part of parts) {
    if (value && typeof value === 'object' && part in value) {
      value = value[part];
    } else {
      return undefined;
    }
  }

  return value;
}

// Made with Bob
