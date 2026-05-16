import { GitDiffResult, FileDiff } from '../types/git.types';
import {
  GeneratedTestSuggestions,
  TestSuggestion,
  TestSuggestionContext,
  AIGenerationOptions,
  TEST_FRAMEWORKS,
} from '../types/ai.types';
import { GraniteClient, getGraniteClient } from '../ai/granite-client';
import {
  buildTestSuggestionPrompt,
  TEST_SUGGESTION_PROMPT,
} from '../ai/prompts';
import { logger } from '../utils/logger';
import { AIError } from '../utils/errors';

/**
 * TestGenerator class for generating test suggestions
 */
export class TestGenerator {
  private client: GraniteClient;

  constructor(client?: GraniteClient) {
    this.client = client || getGraniteClient();
  }

  /**
   * Generate test suggestions for changed files
   */
  async generateTestSuggestions(
    diffResult: GitDiffResult,
    options?: AIGenerationOptions & {
      includeCodeSnippets?: boolean;
      maxFilesToAnalyze?: number;
    }
  ): Promise<GeneratedTestSuggestions> {
    logger.info('Generating test suggestions', 'TestGenerator', {
      totalFiles: diffResult.totalFiles,
    });

    const includeCodeSnippets = options?.includeCodeSnippets !== false;
    const maxFiles = options?.maxFilesToAnalyze || 5;

    try {
      // Filter files that need tests (exclude test files, configs, etc.)
      const filesToTest = this.filterTestableFiles(diffResult.files).slice(
        0,
        maxFiles
      );

      if (filesToTest.length === 0) {
        logger.info('No testable files found', 'TestGenerator');
        return {
          unitTests: [],
          integrationTests: [],
          e2eTests: [],
          totalSuggestions: 0,
        };
      }

      // Generate suggestions for each file
      const allSuggestions = await Promise.all(
        filesToTest.map(file =>
          this.generateSuggestionsForFile(file, includeCodeSnippets, options)
        )
      );

      // Combine and categorize suggestions
      const combined = this.combineSuggestions(allSuggestions);

      logger.info('Test suggestions generated successfully', 'TestGenerator', {
        totalSuggestions: combined.totalSuggestions,
        unitTests: combined.unitTests.length,
        integrationTests: combined.integrationTests.length,
      });

      return combined;
    } catch (error: any) {
      logger.error('Failed to generate test suggestions', 'TestGenerator', {
        error: error.message,
      });
      throw new AIError('Failed to generate test suggestions', { cause: error });
    }
  }

  /**
   * Generate test suggestions for a single file
   */
  private async generateSuggestionsForFile(
    file: FileDiff,
    includeCodeSnippets: boolean,
    options?: AIGenerationOptions
  ): Promise<TestSuggestion[]> {
    logger.debug(`Generating tests for ${file.path}`, 'TestGenerator');

    // Build context
    const context = this.buildTestContext(file);

    // Build prompt
    const prompt = buildTestSuggestionPrompt(context);

    // Generate with AI
    const result = await this.client.generate(prompt, {
      ...TEST_SUGGESTION_PROMPT.defaultParams,
      ...options,
    });

    // Parse suggestions
    const suggestions = this.parseSuggestions(
      result.text,
      file,
      includeCodeSnippets
    );

    return suggestions;
  }

  /**
   * Filter files that should have tests
   */
  private filterTestableFiles(files: FileDiff[]): FileDiff[] {
    return files.filter(file => {
      // Skip test files
      if (this.isTestFile(file.path)) {
        return false;
      }

      // Skip config files
      if (this.isConfigFile(file.path)) {
        return false;
      }

      // Skip binary files
      if (file.binary) {
        return false;
      }

      // Skip deleted files
      if (file.status === 'deleted') {
        return false;
      }

      // Only include files with code
      const codeExtensions = [
        '.ts',
        '.tsx',
        '.js',
        '.jsx',
        '.py',
        '.java',
        '.go',
        '.rs',
        '.rb',
        '.php',
      ];
      return codeExtensions.some(ext => file.path.endsWith(ext));
    });
  }

  /**
   * Check if file is a test file
   */
  private isTestFile(path: string): boolean {
    return (
      path.includes('.test.') ||
      path.includes('.spec.') ||
      path.includes('__tests__') ||
      path.includes('/test/') ||
      path.includes('/tests/')
    );
  }

  /**
   * Check if file is a config file
   */
  private isConfigFile(path: string): boolean {
    return (
      path.includes('.config.') ||
      path.endsWith('.json') ||
      path.endsWith('.yml') ||
      path.endsWith('.yaml') ||
      path.endsWith('.toml')
    );
  }

  /**
   * Build test context from file diff
   */
  private buildTestContext(file: FileDiff): TestSuggestionContext {
    // Extract functions/methods from changes
    const functions = this.extractFunctions(file);

    // Get code snippets from additions
    const codeSnippets = this.extractCodeSnippets(file);

    // Detect language
    const language = file.language || this.detectLanguage(file.path);

    return {
      file: file.path,
      language,
      functions,
      codeSnippets,
    };
  }

  /**
   * Extract function names from file changes
   */
  private extractFunctions(file: FileDiff): string[] {
    const functions: string[] = [];

    for (const hunk of file.hunks) {
      for (const change of hunk.changes) {
        if (change.type === 'addition') {
          // Match function declarations (simplified)
          const patterns = [
            /function\s+(\w+)/g, // JavaScript/TypeScript function
            /const\s+(\w+)\s*=\s*(?:async\s*)?\(/g, // Arrow function
            /def\s+(\w+)/g, // Python
            /public\s+\w+\s+(\w+)\s*\(/g, // Java/C#
            /func\s+(\w+)/g, // Go
            /fn\s+(\w+)/g, // Rust
          ];

          for (const pattern of patterns) {
            const matches = change.content.matchAll(pattern);
            for (const match of matches) {
              if (match[1]) {
                functions.push(match[1]);
              }
            }
          }
        }
      }
    }

    return Array.from(new Set(functions)); // Remove duplicates
  }

  /**
   * Extract code snippets from additions
   */
  private extractCodeSnippets(file: FileDiff): string[] {
    const snippets: string[] = [];
    let currentSnippet: string[] = [];

    for (const hunk of file.hunks) {
      for (const change of hunk.changes) {
        if (change.type === 'addition') {
          currentSnippet.push(change.content);

          // If we have 5+ lines, save as snippet
          if (currentSnippet.length >= 5) {
            snippets.push(currentSnippet.join('\n'));
            currentSnippet = [];
          }
        } else {
          // Reset on non-addition
          if (currentSnippet.length > 0) {
            snippets.push(currentSnippet.join('\n'));
            currentSnippet = [];
          }
        }
      }
    }

    // Add remaining snippet
    if (currentSnippet.length > 0) {
      snippets.push(currentSnippet.join('\n'));
    }

    return snippets.slice(0, 3); // Limit to 3 snippets
  }

  /**
   * Detect language from file path
   */
  private detectLanguage(path: string): string {
    const ext = path.substring(path.lastIndexOf('.'));

    const languageMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.java': 'java',
      '.go': 'go',
      '.rs': 'rust',
      '.rb': 'ruby',
      '.php': 'php',
    };

    return languageMap[ext] || 'unknown';
  }

  /**
   * Parse test suggestions from AI response
   */
  private parseSuggestions(
    text: string,
    file: FileDiff,
    includeCodeSnippets: boolean
  ): TestSuggestion[] {
    const suggestions: TestSuggestion[] = [];

    // Split by test blocks (looking for describe/it patterns or numbered lists)
    const testBlocks = this.extractTestBlocks(text);

    for (const block of testBlocks) {
      const suggestion = this.parseTestBlock(block, file, includeCodeSnippets);
      if (suggestion) {
        suggestions.push(suggestion);
      }
    }

    // If no structured tests found, create generic suggestions
    if (suggestions.length === 0) {
      suggestions.push(...this.createGenericSuggestions(file));
    }

    return suggestions;
  }

  /**
   * Extract test blocks from text
   */
  private extractTestBlocks(text: string): string[] {
    // Try to extract code blocks
    const codeBlockRegex = /```[\s\S]*?```/g;
    const codeBlocks = text.match(codeBlockRegex);

    if (codeBlocks) {
      return codeBlocks;
    }

    // Try to extract by describe blocks
    const describeRegex = /describe\([^)]+\)[\s\S]*?(?=describe\(|$)/g;
    const describeBlocks = text.match(describeRegex);

    if (describeBlocks) {
      return describeBlocks;
    }

    // Fallback: split by double newlines
    return text.split('\n\n').filter(b => b.trim().length > 0);
  }

  /**
   * Parse a single test block
   */
  private parseTestBlock(
    block: string,
    file: FileDiff,
    includeCodeSnippets: boolean
  ): TestSuggestion | null {
    // Extract test description
    const descMatch = block.match(/it\(['"]([^'"]+)['"]/);
    const description = descMatch ? descMatch[1] : 'Test case';

    // Determine test type
    const type = this.determineTestType(block, file);

    // Extract code snippet if requested
    let codeSnippet: string | undefined;
    if (includeCodeSnippets) {
      const codeMatch = block.match(/```(?:\w+)?\n([\s\S]*?)```/);
      codeSnippet = codeMatch && codeMatch[1] ? codeMatch[1].trim() : block.trim();
    }

    // Determine framework
    const framework = this.getTestFramework(file.language || 'typescript');

    // Calculate priority (higher for unit tests)
    const priority = type === 'unit' ? 5 : type === 'integration' ? 3 : 2;

    return {
      type,
      description: description || 'Test case',
      scenario: this.extractScenario(block),
      codeSnippet,
      framework,
      priority,
    };
  }

  /**
   * Determine test type from block content
   */
  private determineTestType(
    block: string,
    _file: FileDiff
  ): 'unit' | 'integration' | 'e2e' {
    const lowerBlock = block.toLowerCase();

    if (
      lowerBlock.includes('integration') ||
      lowerBlock.includes('api') ||
      lowerBlock.includes('database')
    ) {
      return 'integration';
    }

    if (
      lowerBlock.includes('e2e') ||
      lowerBlock.includes('end-to-end') ||
      lowerBlock.includes('browser')
    ) {
      return 'e2e';
    }

    return 'unit';
  }

  /**
   * Extract test scenario from block
   */
  private extractScenario(block: string): string {
    // Try to find scenario description
    const scenarioMatch = block.match(/(?:should|when|given)[\s\S]{0,100}/i);
    if (scenarioMatch) {
      return scenarioMatch[0].trim();
    }

    // Fallback to first line
    const firstLine = block.split('\n')[0];
    return firstLine ? firstLine.substring(0, 100) : 'Test scenario';
  }

  /**
   * Get test framework for language
   */
  private getTestFramework(language: string): string {
    const frameworks = TEST_FRAMEWORKS[language];
    return frameworks && frameworks[0] ? frameworks[0] : 'jest';
  }

  /**
   * Create generic test suggestions when AI doesn't provide structured output
   */
  private createGenericSuggestions(file: FileDiff): TestSuggestion[] {
    const framework = this.getTestFramework(file.language || 'typescript');

    return [
      {
        type: 'unit',
        description: `Test ${file.path} functionality`,
        scenario: 'Verify core functionality works as expected',
        framework,
        priority: 4,
      },
      {
        type: 'unit',
        description: `Test ${file.path} edge cases`,
        scenario: 'Handle edge cases and error conditions',
        framework,
        priority: 3,
      },
    ];
  }

  /**
   * Combine suggestions from multiple files
   */
  private combineSuggestions(
    allSuggestions: TestSuggestion[][]
  ): GeneratedTestSuggestions {
    const flat = allSuggestions.flat();

    const unitTests = flat.filter(s => s.type === 'unit');
    const integrationTests = flat.filter(s => s.type === 'integration');
    const e2eTests = flat.filter(s => s.type === 'e2e');

    // Sort by priority
    unitTests.sort((a, b) => b.priority - a.priority);
    integrationTests.sort((a, b) => b.priority - a.priority);
    e2eTests.sort((a, b) => b.priority - a.priority);

    return {
      unitTests,
      integrationTests,
      e2eTests,
      totalSuggestions: flat.length,
      estimatedCoverageImprovement: this.estimateCoverageImprovement(flat),
    };
  }

  /**
   * Estimate coverage improvement percentage
   */
  private estimateCoverageImprovement(suggestions: TestSuggestion[]): number {
    // Simple heuristic: each unit test adds ~5%, integration ~3%, e2e ~2%
    const unitCount = suggestions.filter(s => s.type === 'unit').length;
    const integrationCount = suggestions.filter(s => s.type === 'integration')
      .length;
    const e2eCount = suggestions.filter(s => s.type === 'e2e').length;

    const improvement = unitCount * 5 + integrationCount * 3 + e2eCount * 2;

    // Cap at 50%
    return Math.min(improvement, 50);
  }

  /**
   * Format test suggestions as markdown
   */
  formatTestSuggestionsMarkdown(suggestions: GeneratedTestSuggestions): string {
    let markdown = '# Test Suggestions\n\n';

    if (suggestions.unitTests.length > 0) {
      markdown += '## Unit Tests\n\n';
      suggestions.unitTests.forEach((test, i) => {
        markdown += `### ${i + 1}. ${test.description}\n\n`;
        markdown += `**Scenario:** ${test.scenario}\n\n`;
        markdown += `**Framework:** ${test.framework}\n\n`;
        markdown += `**Priority:** ${'⭐'.repeat(test.priority)}\n\n`;
        if (test.codeSnippet) {
          markdown += '```typescript\n';
          markdown += test.codeSnippet;
          markdown += '\n```\n\n';
        }
      });
    }

    if (suggestions.integrationTests.length > 0) {
      markdown += '## Integration Tests\n\n';
      suggestions.integrationTests.forEach((test, i) => {
        markdown += `### ${i + 1}. ${test.description}\n\n`;
        markdown += `**Scenario:** ${test.scenario}\n\n`;
        markdown += `**Framework:** ${test.framework}\n\n`;
        if (test.codeSnippet) {
          markdown += '```typescript\n';
          markdown += test.codeSnippet;
          markdown += '\n```\n\n';
        }
      });
    }

    if (suggestions.e2eTests.length > 0) {
      markdown += '## E2E Tests\n\n';
      suggestions.e2eTests.forEach((test, i) => {
        markdown += `### ${i + 1}. ${test.description}\n\n`;
        markdown += `**Scenario:** ${test.scenario}\n\n`;
        if (test.codeSnippet) {
          markdown += '```typescript\n';
          markdown += test.codeSnippet;
          markdown += '\n```\n\n';
        }
      });
    }

    if (suggestions.estimatedCoverageImprovement) {
      markdown += `\n---\n\n`;
      markdown += `**Estimated Coverage Improvement:** +${suggestions.estimatedCoverageImprovement}%\n`;
    }

    return markdown;
  }
}

/**
 * Create a TestGenerator instance
 */
export function createTestGenerator(client?: GraniteClient): TestGenerator {
  return new TestGenerator(client);
}

// Made with Bob