# PR Copilot - Project Plan

## Overview
A Bob custom mode that analyzes git changes and generates PR content using IBM watsonx.ai Granite models.

## Tech Stack
- **Language**: TypeScript/Node.js
- **AI Provider**: IBM watsonx.ai (Granite models) - FREE with hackathon credits
- **Integration**: Bob custom mode with `/pr-ready` slash command
- **Git Operations**: Node.js child_process for git commands
- **Output**: Markdown-formatted content for developer review

## Architecture

### High-Level Component Flow

```
User types /pr-ready in Bob
         ↓
Command Handler (mode entry point)
         ↓
Git Diff Analyzer ──→ Extract changed files & content
         ↓
Security Scanner ──→ Detect sensitive data (API keys, passwords)
         ↓
IBM Granite AI ──→ Generate PR title, description, test suggestions
         ↓
Risk Assessor ──→ Calculate risk score (Low/Medium/High)
         ↓
Output Formatter ──→ Present results in Bob
```

### Core Components

#### 1. **Command Handler** (`src/index.ts`)
- Entry point for Bob mode
- Parses `/pr-ready` command
- Orchestrates the entire workflow
- Handles errors and user feedback

#### 2. **Git Diff Analyzer** (`src/git/diff-analyzer.ts`)
- Executes `git diff` command
- Parses diff output into structured data
- Identifies changed files, additions, deletions
- Extracts code context for AI analysis

#### 3. **Security Scanner** (`src/security/scanner.ts`)
- Scans diffs for sensitive patterns:
  - API keys (AWS, Google, GitHub tokens)
  - Hardcoded passwords
  - Private keys (RSA, SSH)
  - Database connection strings
  - Email addresses in code
- Returns findings with line numbers and severity

#### 4. **IBM Granite AI Client** (`src/ai/granite-client.ts`)
- Connects to IBM watsonx.ai API
- Handles authentication with IBM Cloud credentials
- Sends prompts to Granite model
- Manages rate limiting and retries

#### 5. **PR Content Generator** (`src/generators/pr-generator.ts`)
- Uses Granite AI to create:
  - Concise PR title (50-72 chars)
  - Detailed PR description with:
    - What changed
    - Why it changed
    - Impact analysis
- Formats output in GitHub PR template style

#### 6. **Test Suggestion Engine** (`src/generators/test-generator.ts`)
- Analyzes changed code to suggest:
  - Test scenarios (what to test)
  - Code snippets (example test implementations)
- Supports multiple test frameworks (Jest, Mocha, Pytest)
- Generates both unit and integration test ideas

#### 7. **Risk Assessor** (`src/risk/assessor.ts`)
- Calculates risk score based on:
  - Security findings (weight: 40%)
  - Code complexity changes (weight: 30%)
  - Number of files changed (weight: 15%)
  - Critical file modifications (weight: 15%)
- Returns: Low / Medium / High risk rating

#### 8. **Output Formatter** (`src/formatters/output-formatter.ts`)
- Formats all results for Bob display
- Creates markdown with sections:
  - PR Title & Description
  - Security Findings (if any)
  - Test Suggestions
  - Risk Assessment
- Adds color coding and emojis for readability

## File Structure

```
pr-copilot-bob/
├── .bob/
│   ├── modes/
│   │   └── pr-copilot.json          # Bob mode configuration
│   └── rules-plan/
│       └── AGENTS.md                 # Existing rules
├── src/
│   ├── index.ts                      # Main entry point
│   ├── types/
│   │   ├── git.types.ts             # Git diff types
│   │   ├── security.types.ts        # Security finding types
│   │   ├── ai.types.ts              # AI request/response types
│   │   └── risk.types.ts            # Risk assessment types
│   ├── git/
│   │   ├── diff-analyzer.ts         # Git diff parsing
│   │   └── git-executor.ts          # Git command execution
│   ├── security/
│   │   ├── scanner.ts               # Security pattern detection
│   │   └── patterns.ts              # Regex patterns for secrets
│   ├── ai/
│   │   ├── granite-client.ts        # IBM watsonx.ai client
│   │   └── prompts.ts               # AI prompt templates
│   ├── generators/
│   │   ├── pr-generator.ts          # PR content generation
│   │   └── test-generator.ts        # Test suggestion generation
│   ├── risk/
│   │   ├── assessor.ts              # Risk calculation logic
│   │   └── scoring.ts               # Scoring algorithms
│   ├── formatters/
│   │   └── output-formatter.ts      # Markdown output formatting
│   ├── utils/
│   │   ├── logger.ts                # Logging utility
│   │   ├── config.ts                # Configuration loader
│   │   └── errors.ts                # Custom error classes
│   └── config/
│       └── default.config.ts        # Default configuration
├── tests/
│   ├── unit/
│   │   ├── git/
│   │   ├── security/
│   │   ├── ai/
│   │   └── risk/
│   └── integration/
│       └── pr-copilot.test.ts
├── .env.example                      # Environment variables template
├── .gitignore
├── package.json
├── tsconfig.json
├── README.md
└── PROJECT_PLAN.md                   # This file
```

## Configuration Strategy

### Environment Variables (`.env`)
```
# IBM watsonx.ai Configuration
IBM_CLOUD_API_KEY=your_api_key_here
IBM_WATSONX_PROJECT_ID=your_project_id
IBM_WATSONX_URL=https://us-south.ml.cloud.ibm.com

# Model Configuration
GRANITE_MODEL_ID=ibm/granite-13b-chat-v2
GRANITE_MAX_TOKENS=2048
GRANITE_TEMPERATURE=0.7

# Security Scanner Configuration
SECURITY_SCAN_ENABLED=true
SECURITY_PATTERNS_FILE=./src/security/patterns.ts

# Risk Assessment Configuration
RISK_THRESHOLD_HIGH=75
RISK_THRESHOLD_MEDIUM=40

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/pr-copilot.log
```

### Bob Mode Configuration (`.bob/modes/pr-copilot.json`)
```json
{
  "slug": "pr-copilot",
  "name": "🚀 PR Copilot",
  "description": "Analyze changes and generate PR content with AI",
  "version": "1.0.0",
  "commands": [
    {
      "name": "pr-ready",
      "description": "Analyze git diff and generate PR content",
      "handler": "src/index.ts"
    }
  ],
  "capabilities": {
    "git": true,
    "ai": true,
    "fileAccess": true
  }
}
```

## Dependencies

### Production Dependencies
```json
{
  "@ibm-cloud/watsonx-ai": "^1.0.0",
  "simple-git": "^3.20.0",
  "dotenv": "^16.3.1",
  "chalk": "^5.3.0",
  "ora": "^7.0.1"
}
```

### Development Dependencies
```json
{
  "@types/node": "^20.10.0",
  "typescript": "^5.3.0",
  "ts-node": "^10.9.0",
  "jest": "^29.7.0",
  "@types/jest": "^29.5.0",
  "eslint": "^8.55.0",
  "@typescript-eslint/eslint-plugin": "^6.15.0",
  "@typescript-eslint/parser": "^6.15.0",
  "prettier": "^3.1.0"
}
```

## Error Handling Strategy

### Error Types
1. **GitError**: Git command failures (not a git repo, no changes, etc.)
2. **SecurityError**: Critical security findings that block PR
3. **AIError**: IBM watsonx.ai API failures (auth, rate limit, timeout)
4. **ConfigError**: Missing or invalid configuration
5. **ValidationError**: Invalid input or state

### Error Handling Flow
```
Error Occurs
     ↓
Catch & Classify Error Type
     ↓
Log Error Details
     ↓
Format User-Friendly Message
     ↓
Display in Bob with Recovery Suggestions
     ↓
Graceful Degradation (if possible)
```

## Logging Approach

### Log Levels
- **ERROR**: Critical failures that stop execution
- **WARN**: Issues that don't stop execution but need attention
- **INFO**: Important milestones (command start, AI call, completion)
- **DEBUG**: Detailed execution flow for troubleshooting

### Log Format
```
[2026-05-16T06:21:00.000Z] [INFO] [pr-copilot] Command /pr-ready initiated
[2026-05-16T06:21:01.234Z] [DEBUG] [git-analyzer] Found 5 changed files
[2026-05-16T06:21:02.456Z] [WARN] [security-scanner] Potential API key detected in file.ts:42
[2026-05-16T06:21:05.789Z] [INFO] [granite-client] AI generation completed (1234ms)
```

## Output Format Example

```markdown
# 🚀 PR Analysis Complete

## 📝 Suggested PR Title
feat: Add user authentication with JWT tokens

## 📄 PR Description
### What Changed
- Implemented JWT-based authentication system
- Added login and registration endpoints
- Created middleware for token validation
- Updated user model with password hashing

### Why This Change
Addresses security requirements for user authentication as outlined in issue #123.

### Impact
- All API endpoints now require authentication
- Existing users will need to re-login
- Database migration required for password field

## 🔒 Security Findings
⚠️ **MEDIUM RISK** - 2 issues found:

1. **Potential API Key** in `src/config/api.ts:15`
   ```typescript
   const API_KEY = "sk-1234567890abcdef";
   ```
   **Recommendation**: Move to environment variables

2. **Hardcoded Secret** in `src/auth/jwt.ts:8`
   ```typescript
   const JWT_SECRET = "my-secret-key";
   ```
   **Recommendation**: Use environment variable

## 🧪 Test Suggestions

### Unit Tests
1. **Authentication Service**
   ```typescript
   describe('AuthService', () => {
     it('should generate valid JWT token', async () => {
       const token = await authService.generateToken(userId);
       expect(token).toBeDefined();
       expect(jwt.verify(token, JWT_SECRET)).toBeTruthy();
     });
   });
   ```

2. **Password Hashing**
   ```typescript
   it('should hash password correctly', async () => {
     const hashed = await hashPassword('password123');
     expect(hashed).not.toBe('password123');
     expect(await comparePassword('password123', hashed)).toBe(true);
   });
   ```

### Integration Tests
1. Test login endpoint with valid credentials
2. Test registration with duplicate email
3. Test protected routes without token

## ⚠️ Risk Assessment
**Overall Risk: MEDIUM**

- Security Issues: 2 findings (MEDIUM severity)
- Code Complexity: Moderate increase
- Files Changed: 8 files
- Critical Files: Yes (authentication system)

**Recommendations:**
- Fix security issues before merging
- Add comprehensive tests for auth flow
- Review by security team recommended
```

## Implementation Phases

### Phase 1: Core Infrastructure (Files 1-8)
1. Set up TypeScript project structure
2. Create type definitions
3. Implement git diff analyzer
4. Set up IBM watsonx.ai client
5. Create basic error handling
6. Implement logging utility
7. Create configuration loader
8. Set up Bob mode configuration

### Phase 2: Security & Analysis (Files 9-12)
9. Implement security scanner with patterns
10. Create risk assessment logic
11. Build scoring algorithms
12. Add security pattern database

### Phase 3: AI Generation (Files 13-16)
13. Create PR content generator with prompts
14. Implement test suggestion engine
15. Build prompt templates for Granite
16. Add AI response parsing

### Phase 4: Integration & Output (Files 17-20)
17. Create output formatter
18. Implement command handler
19. Add Bob mode integration
20. Create comprehensive error messages

### Phase 5: Testing & Documentation (Files 21-25)
21. Write unit tests for all modules
22. Create integration tests
23. Write README with setup instructions
24. Create .env.example file
25. Add inline code documentation

## Success Criteria

✅ User can type `/pr-ready` in Bob
✅ Tool analyzes git diff successfully
✅ IBM Granite generates relevant PR title & description
✅ Security scanner detects common secrets
✅ Test suggestions include code snippets
✅ Risk score is calculated accurately
✅ Output is formatted clearly in Bob
✅ Errors are handled gracefully
✅ Works within IBM Cloud free tier limits

## Next Steps

After plan approval:
1. Switch to Code mode
2. Initialize TypeScript project
3. Install dependencies
4. Create file structure
5. Implement components phase by phase
6. Test with real git repositories
7. Iterate based on feedback