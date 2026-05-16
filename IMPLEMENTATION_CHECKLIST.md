# PR Copilot - Implementation Checklist

This checklist breaks down the implementation into 25 specific files to create, organized by phase.

## Phase 1: Core Infrastructure (8 files)

### Setup Files
- [ ] `package.json` - Project dependencies and scripts
- [ ] `tsconfig.json` - TypeScript configuration
- [ ] `.env.example` - Environment variables template
- [ ] `README.md` - Setup and usage instructions

### Type Definitions
- [ ] `src/types/git.types.ts` - Git diff and file change types
- [ ] `src/types/security.types.ts` - Security finding types
- [ ] `src/types/ai.types.ts` - IBM Granite request/response types
- [ ] `src/types/risk.types.ts` - Risk assessment types

## Phase 2: Utilities & Configuration (4 files)

- [ ] `src/utils/logger.ts` - Logging utility with levels
- [ ] `src/utils/config.ts` - Configuration loader from .env
- [ ] `src/utils/errors.ts` - Custom error classes
- [ ] `src/config/default.config.ts` - Default configuration values

## Phase 3: Git Operations (2 files)

- [ ] `src/git/git-executor.ts` - Execute git commands
- [ ] `src/git/diff-analyzer.ts` - Parse git diff output

## Phase 4: Security Scanner (2 files)

- [ ] `src/security/patterns.ts` - Regex patterns for secrets
- [ ] `src/security/scanner.ts` - Security pattern detection

## Phase 5: IBM Granite AI Integration (2 files)

- [ ] `src/ai/prompts.ts` - AI prompt templates
- [ ] `src/ai/granite-client.ts` - IBM watsonx.ai client

## Phase 6: Content Generators (2 files)

- [ ] `src/generators/pr-generator.ts` - PR title & description
- [ ] `src/generators/test-generator.ts` - Test suggestions

## Phase 7: Risk Assessment (2 files)

- [ ] `src/risk/scoring.ts` - Scoring algorithms
- [ ] `src/risk/assessor.ts` - Risk calculation logic

## Phase 8: Output & Integration (2 files)

- [ ] `src/formatters/output-formatter.ts` - Markdown formatting
- [ ] `src/index.ts` - Main entry point & command handler

## Phase 9: Bob Mode Configuration (1 file)

- [ ] `.bob/modes/pr-copilot.json` - Bob mode definition

## Total: 25 Files

---

## Implementation Order Recommendation

1. Start with Phase 1 (setup + types) - Foundation
2. Move to Phase 2 (utilities) - Shared infrastructure
3. Implement Phase 3 (git) - Core functionality
4. Add Phase 4 (security) - Critical feature
5. Integrate Phase 5 (AI) - IBM Granite connection
6. Build Phase 6 (generators) - Content creation
7. Complete Phase 7 (risk) - Assessment logic
8. Finish Phase 8 (output) - User interface
9. Configure Phase 9 (Bob) - Integration

## Testing Strategy

After each phase, test the components:
- Phase 1-2: Run `npm run build` to verify setup
- Phase 3: Test git diff parsing with sample repos
- Phase 4: Test security scanner with known patterns
- Phase 5: Test IBM Granite API connection
- Phase 6-7: Test generators with sample diffs
- Phase 8-9: End-to-end test with `/pr-ready` command

## Estimated Implementation Time

- Phase 1: 1-2 hours (setup)
- Phase 2: 1 hour (utilities)
- Phase 3: 2 hours (git parsing)
- Phase 4: 2 hours (security patterns)
- Phase 5: 2-3 hours (IBM integration)
- Phase 6: 2-3 hours (AI generators)
- Phase 7: 1-2 hours (risk logic)
- Phase 8: 1-2 hours (formatting)
- Phase 9: 30 minutes (Bob config)

**Total: 13-18 hours** (can be done over 2-3 days)