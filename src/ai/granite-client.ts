import { WatsonXAI } from '@ibm-cloud/watsonx-ai';
import {
  GraniteRequestParams,
  GraniteResponse,
  AIGenerationOptions,
  AIGenerationResult,
  AIClientConfig,
} from '../types/ai.types';
import {
  AuthenticationError,
  RateLimitError,
  TimeoutError,
  InvalidResponseError,
  AIError,
} from '../utils/errors';
import { logger } from '../utils/logger';
import { getConfig } from '../utils/config';

/**
 * Default generation options
 */
const DEFAULT_OPTIONS: AIGenerationOptions = {
  maxTokens: 2048,
  temperature: 0.7,
  topP: 0.95,
  timeoutMs: 30000,
  maxRetries: 3,
  retryDelayMs: 1000,
};

/**
 * GraniteClient class for interacting with IBM watsonx.ai
 */
export class GraniteClient {
  private client: WatsonXAI;
  private config: AIClientConfig;
  private requestCount: number = 0;
  private successCount: number = 0;
  private failureCount: number = 0;

  constructor(config?: Partial<AIClientConfig>) {
    const appConfig = getConfig();

    // Build full configuration
    this.config = {
      apiKey: config?.apiKey || appConfig.ibm.apiKey,
      projectId: config?.projectId || appConfig.ibm.projectId,
      url: config?.url || appConfig.ibm.url,
      modelId: config?.modelId || appConfig.granite.modelId,
      defaultOptions: {
        ...DEFAULT_OPTIONS,
        maxTokens: appConfig.granite.maxTokens,
        temperature: appConfig.granite.temperature,
        topP: appConfig.granite.topP,
        timeoutMs: appConfig.performance.aiTimeoutMs,
        maxRetries: appConfig.performance.maxRetries,
        retryDelayMs: appConfig.performance.retryDelayMs,
        ...config?.defaultOptions,
      },
      enableCache: config?.enableCache ?? false,
      cacheTTL: config?.cacheTTL ?? 3600000, // 1 hour
    };

    // Initialize watsonx.ai client
    try {
      this.client = WatsonXAI.newInstance({
        version: '2024-05-31',
        serviceUrl: this.config.url,
        watsonxAiApikey: this.config.apiKey,
      });

      logger.info('Granite client initialized', 'GraniteClient', {
        url: this.config.url,
        modelId: this.config.modelId,
      });
    } catch (error: any) {
      logger.error('Failed to initialize Granite client', 'GraniteClient', {
        error: error.message,
      });
      throw new AuthenticationError('IBM watsonx.ai', error.message);
    }
  }

  /**
   * Generate text using Granite model
   */
  async generate(
    prompt: string,
    options?: AIGenerationOptions
  ): Promise<AIGenerationResult> {
    const startTime = Date.now();
    this.requestCount++;

    // Merge options with defaults
    const genOptions = {
      ...this.config.defaultOptions,
      ...options,
    };

    logger.debug('Generating text with Granite', 'GraniteClient', {
      promptLength: prompt.length,
      options: genOptions,
    });

    try {
      // Build request parameters
      const params: any = {
        modelId: this.config.modelId,
        model_id: this.config.modelId,
        input: prompt,
        parameters: {
          max_new_tokens: genOptions.maxTokens!,
          temperature: genOptions.temperature!,
          top_p: genOptions.topP!,
          repetition_penalty: 1.05,
        },
        projectId: this.config.projectId,
        project_id: this.config.projectId,
      };

      // Generate with retries
      const response = await this.generateWithRetry(params, genOptions);

      // Parse response
      const result = this.parseResponse(response, startTime);

      this.successCount++;
      logger.info('Text generation successful', 'GraniteClient', {
        tokensUsed: result.tokensUsed.total,
        durationMs: result.durationMs,
      });

      return result;
    } catch (error: any) {
      this.failureCount++;
      logger.error('Text generation failed', 'GraniteClient', {
        error: error.message,
      });
      throw this.handleError(error);
    }
  }

  /**
   * Generate with retry logic
   */
  private async generateWithRetry(
    params: GraniteRequestParams,
    options: AIGenerationOptions
  ): Promise<GraniteResponse> {
    const maxRetries = options.maxRetries || 3;
    const retryDelay = options.retryDelayMs || 1000;
    const timeout = options.timeoutMs || 30000;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new TimeoutError('Text generation', timeout));
          }, timeout);
        });

        // Create generation promise
        const generationPromise = this.client.generateText(params as any);

        // Race between generation and timeout
        const response = await Promise.race([
          generationPromise,
          timeoutPromise,
        ]);

        return response.result as GraniteResponse;
      } catch (error: any) {
        lastError = error;

        // Don't retry on authentication errors
        if (error.status === 401 || error.status === 403) {
          throw error;
        }

        // Check if we should retry
        if (attempt < maxRetries) {
          const delay = retryDelay * Math.pow(2, attempt); // Exponential backoff
          logger.warn(
            `Generation attempt ${attempt + 1} failed, retrying in ${delay}ms`,
            'GraniteClient',
            { error: error.message }
          );
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new AIError('Text generation failed after retries');
  }

  /**
   * Parse watsonx.ai response
   */
  private parseResponse(
    response: GraniteResponse,
    startTime: number
  ): AIGenerationResult {
    if (!response.results || response.results.length === 0) {
      throw new InvalidResponseError('No results in response', response);
    }

    const result = response.results[0];
    if (!result) {
      throw new InvalidResponseError('No result at index 0', response);
    }

    if (!result.generated_text) {
      throw new InvalidResponseError('No generated text in result', result);
    }

    const durationMs = Date.now() - startTime;

    return {
      text: result.generated_text.trim(),
      tokensUsed: {
        input: result.input_token_count || 0,
        output: result.generated_token_count || 0,
        total: (result.input_token_count || 0) + (result.generated_token_count || 0),
      },
      durationMs,
      model: response.model_id,
    };
  }

  /**
   * Handle errors from watsonx.ai
   */
  private handleError(error: any): Error {
    // Authentication errors
    if (error.status === 401 || error.status === 403) {
      return new AuthenticationError(
        'IBM watsonx.ai',
        error.message || 'Invalid API key or project ID'
      );
    }

    // Rate limit errors
    if (error.status === 429) {
      const retryAfter = error.headers?.['retry-after'];
      return new RateLimitError(
        'IBM watsonx.ai',
        retryAfter ? parseInt(retryAfter, 10) : undefined
      );
    }

    // Timeout errors
    if (error instanceof TimeoutError) {
      return error;
    }

    // Invalid response errors
    if (error instanceof InvalidResponseError) {
      return error;
    }

    // Generic AI error
    return new AIError(error.message || 'Unknown error occurred', {
      status: error.status,
      code: error.code,
    });
  }

  /**
   * Sleep utility for retries
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get client statistics
   */
  getStats(): {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    successRate: number;
  } {
    return {
      totalRequests: this.requestCount,
      successfulRequests: this.successCount,
      failedRequests: this.failureCount,
      successRate:
        this.requestCount > 0 ? this.successCount / this.requestCount : 0,
    };
  }

  /**
   * Test connection to watsonx.ai
   */
  async testConnection(): Promise<boolean> {
    try {
      logger.info('Testing connection to watsonx.ai', 'GraniteClient');

      const result = await this.generate('Hello, world!', {
        maxTokens: 10,
        temperature: 0.1,
        timeoutMs: 10000,
        maxRetries: 1,
      });

      logger.info('Connection test successful', 'GraniteClient', {
        responseLength: result.text.length,
      });

      return true;
    } catch (error: any) {
      logger.error('Connection test failed', 'GraniteClient', {
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Get model information
   */
  getModelInfo(): {
    modelId: string;
    url: string;
    projectId: string;
  } {
    return {
      modelId: this.config.modelId,
      url: this.config.url,
      projectId: this.config.projectId,
    };
  }
}

/**
 * Create a GraniteClient instance
 */
export function createGraniteClient(
  config?: Partial<AIClientConfig>
): GraniteClient {
  return new GraniteClient(config);
}

/**
 * Singleton instance
 */
let defaultClient: GraniteClient | null = null;

/**
 * Get default GraniteClient instance
 */
export function getGraniteClient(): GraniteClient {
  if (!defaultClient) {
    defaultClient = createGraniteClient();
  }
  return defaultClient;
}

/**
 * Reset default client (useful for testing)
 */
export function resetGraniteClient(): void {
  defaultClient = null;
}

// Made with Bob