import {
  PromptTemplate,
  PRTitleContext,
  PRDescriptionContext,
  TestSuggestionContext,
  STOP_SEQUENCES,
} from '../types/ai.types';

/**
 * Prompt template for generating PR titles
 */
export const PR_TITLE_PROMPT: PromptTemplate = {
  name: 'pr-title',
  system: `You are an expert software engineer who writes clear, concise pull request titles following conventional commit format.
Your titles should be descriptive but brief (under 72 characters).
Use conventional commit types: feat, fix, docs, style, refactor, perf, test, build, ci, chore.`,
  template: `Generate a pull request title for the following changes:

Files changed: {{files}}
Total additions: {{additions}}
Total deletions: {{deletions}}
Languages: {{languages}}
Main changes: {{mainChanges}}

Requirements:
- Follow conventional commit format: type(scope): description
- Keep it under 72 characters
- Be specific and descriptive
- Use present tense
- Don't include "PR" or "Pull Request" in the title

Generate only the title, nothing else:`,
  examples: [
    {
      input: 'Files: src/auth/login.ts, src/auth/logout.ts. Added JWT authentication.',
      output: 'feat(auth): add JWT authentication for login and logout',
    },
    {
      input: 'Files: README.md, docs/api.md. Updated documentation.',
      output: 'docs: update API documentation and README',
    },
    {
      input: 'Files: src/utils/parser.ts. Fixed null pointer exception.',
      output: 'fix(parser): handle null values in data parsing',
    },
  ],
  defaultParams: {
    maxTokens: 100,
    temperature: 0.7,
    topP: 0.9,
  },
};

/**
 * Prompt template for generating PR descriptions
 */
export const PR_DESCRIPTION_PROMPT: PromptTemplate = {
  name: 'pr-description',
  system: `You are an expert software engineer who writes comprehensive pull request descriptions.
Your descriptions should explain what changed, why it changed, and the impact of the changes.
Use clear markdown formatting with sections.`,
  template: `Generate a pull request description for the following changes:

## Changed Files:
{{files}}

## Key Changes:
{{keyChanges}}

## Detected Patterns:
{{patterns}}

{{#if securityIssues}}
## Security Issues Found:
{{securityIssues}}
{{/if}}

Requirements:
- Use markdown formatting
- Include these sections: "What Changed", "Why", "Impact"
- Be specific and technical
- Mention any breaking changes
- Keep it concise but informative
- If security issues exist, mention them in the Impact section

Generate the PR description:`,
  examples: [
    {
      input: 'Added user authentication with JWT tokens',
      output: `## What Changed
- Implemented JWT-based authentication system
- Added login and logout endpoints
- Created middleware for token validation

## Why
- Needed secure user authentication
- JWT provides stateless authentication
- Improves security and scalability

## Impact
- All API endpoints now require authentication
- Breaking change: unauthenticated requests will return 401
- Database migration required for user tokens table`,
    },
  ],
  defaultParams: {
    maxTokens: 800,
    temperature: 0.7,
    topP: 0.95,
  },
};

/**
 * Prompt template for generating test suggestions
 */
export const TEST_SUGGESTION_PROMPT: PromptTemplate = {
  name: 'test-suggestions',
  system: `You are an expert software testing engineer who suggests comprehensive test cases.
You provide specific, actionable test suggestions with code snippets when requested.
Focus on unit tests, integration tests, and edge cases.`,
  template: `Suggest tests for the following code changes:

File: {{file}}
Language: {{language}}

Functions/Methods Changed:
{{functions}}

Code Snippets:
{{codeSnippets}}

{{#if existingTestPatterns}}
Existing Test Patterns:
{{existingTestPatterns}}
{{/if}}

Requirements:
- Suggest unit tests for each function
- Include integration tests if applicable
- Cover edge cases and error scenarios
- Provide Jest/TypeScript code snippets
- Use descriptive test names
- Group related tests in describe blocks

Generate test suggestions with code snippets:`,
  examples: [
    {
      input: 'Function: calculateTotal(items: Item[]): number',
      output: `## Unit Tests

\`\`\`typescript
describe('calculateTotal', () => {
  it('should return 0 for empty array', () => {
    expect(calculateTotal([])).toBe(0);
  });

  it('should calculate sum of item prices', () => {
    const items = [
      { price: 10 },
      { price: 20 },
      { price: 30 }
    ];
    expect(calculateTotal(items)).toBe(60);
  });

  it('should handle negative prices', () => {
    const items = [{ price: -10 }];
    expect(calculateTotal(items)).toBe(-10);
  });

  it('should throw error for null input', () => {
    expect(() => calculateTotal(null)).toThrow();
  });
});
\`\`\``,
    },
  ],
  defaultParams: {
    maxTokens: 1500,
    temperature: 0.7,
    topP: 0.95,
  },
};

/**
 * Prompt template for risk explanation in plain English
 */
export const RISK_EXPLANATION_PROMPT: PromptTemplate = {
  name: 'risk-explanation',
  system: `You are an expert at explaining technical risks in simple, plain English.
Your explanations should be clear, concise, and actionable for non-technical stakeholders.`,
  template: `Explain the following code change risks in plain English:

Risk Score: {{riskScore}}/100
Risk Level: {{riskLevel}}

Security Issues: {{securityCount}}
Complexity Score: {{complexityScore}}
Files Changed: {{filesChanged}}
Critical Files: {{criticalFiles}}

Details:
{{details}}

Requirements:
- Explain in simple, non-technical language
- Focus on business impact
- Provide actionable recommendations
- Keep it under 200 words
- Use bullet points for clarity

Generate plain English explanation:`,
  defaultParams: {
    maxTokens: 400,
    temperature: 0.7,
    topP: 0.9,
  },
};

/**
 * Fill template with context data
 */
export function fillTemplate(template: string, context: Record<string, any>): string {
  let filled = template;

  // Replace simple placeholders {{key}}
  for (const [key, value] of Object.entries(context)) {
    const placeholder = `{{${key}}}`;
    const replacement = Array.isArray(value)
      ? value.join(', ')
      : String(value || '');
    filled = filled.replace(new RegExp(placeholder, 'g'), replacement);
  }

  // Handle conditional blocks {{#if key}}...{{/if}}
  filled = filled.replace(
    /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_, key, content) => {
      return context[key] ? content : '';
    }
  );

  return filled.trim();
}

/**
 * Build PR title prompt from context
 */
export function buildPRTitlePrompt(context: PRTitleContext): string {
  const templateContext = {
    files: context.files.join(', '),
    additions: context.additions,
    deletions: context.deletions,
    languages: context.languages.join(', '),
    mainChanges: context.mainChanges,
  };

  return fillTemplate(PR_TITLE_PROMPT.template, templateContext);
}

/**
 * Build PR description prompt from context
 */
export function buildPRDescriptionPrompt(context: PRDescriptionContext): string {
  const filesText = context.files
    .map(f => `- ${f.path} (${f.status}): +${f.additions} -${f.deletions}`)
    .join('\n');

  const keyChangesText = context.keyChanges
    .map(c => `File: ${c.file}\n${c.change}`)
    .join('\n\n');

  const patternsText = context.patterns.join('\n- ');

  const securityText = context.securityIssues
    ? context.securityIssues.join('\n- ')
    : '';

  const templateContext = {
    files: filesText,
    keyChanges: keyChangesText,
    patterns: patternsText,
    securityIssues: securityText,
  };

  return fillTemplate(PR_DESCRIPTION_PROMPT.template, templateContext);
}

/**
 * Build test suggestion prompt from context
 */
export function buildTestSuggestionPrompt(context: TestSuggestionContext): string {
  const functionsText = context.functions.join('\n- ');
  const codeSnippetsText = context.codeSnippets.join('\n\n');
  const existingPatternsText = context.existingTestPatterns
    ? context.existingTestPatterns.join('\n- ')
    : '';

  const templateContext = {
    file: context.file,
    language: context.language,
    functions: functionsText,
    codeSnippets: codeSnippetsText,
    existingTestPatterns: existingPatternsText,
  };

  return fillTemplate(TEST_SUGGESTION_PROMPT.template, templateContext);
}

/**
 * Get stop sequences for prompt type
 */
export function getStopSequences(promptType: 'title' | 'description' | 'tests'): string[] {
  return STOP_SEQUENCES[promptType] || [];
}

/**
 * Validate generated title
 */
export function validateTitle(title: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (title.length > 72) {
    errors.push('Title exceeds 72 characters');
  }

  if (title.length < 10) {
    errors.push('Title is too short (minimum 10 characters)');
  }

  // Check for conventional commit format
  const conventionalPattern = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore)(\(.+\))?: .+/;
  if (!conventionalPattern.test(title)) {
    errors.push('Title does not follow conventional commit format');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Parse conventional commit title
 */
export function parseConventionalTitle(title: string): {
  type: string;
  scope?: string;
  description: string;
} | null {
  const pattern = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore)(?:\(([^)]+)\))?: (.+)$/;
  const match = title.match(pattern);

  if (!match || !match[1] || !match[3]) {
    return null;
  }

  return {
    type: match[1],
    scope: match[2],
    description: match[3],
  };
}

// Made with Bob