# PR Copilot - Technical Decisions

This document explains the key technical decisions made during the planning phase.

## 1. AI Provider: IBM watsonx.ai (Granite Models)

**Decision**: Use IBM watsonx.ai with Granite models instead of OpenAI or other providers.

**Rationale**:
- ✅ FREE for hackathon participants with IBM Cloud credits
- ✅ Student-friendly (no credit card required for hackathon)
- ✅ Granite models are optimized for code understanding
- ✅ $80 in credits available on IBM Cloud account
- ✅ Good documentation and SDK support

**Alternatives Considered**:
- ❌ OpenAI GPT-4: Too expensive for students ($0.03/1K tokens)
- ❌ Anthropic Claude: Requires paid account
- ❌ Local LLMs: Too slow and resource-intensive

## 2. Integration Method: Bob Custom Mode

**Decision**: Implement as a Bob custom mode with `/pr-ready` slash command.

**Rationale**:
- ✅ Native integration with Bob's workflow
- ✅ Easy to invoke with simple command
- ✅ Leverages Bob's UI for output display
- ✅ No separate CLI tool needed
- ✅ Consistent with Bob's architecture

**Alternatives Considered**:
- ❌ MCP Server: More complex, overkill for this use case
- ❌ Standalone CLI: Requires separate installation and setup
- ❌ VS Code Extension: Different ecosystem, more development effort

## 3. Git Operations: Node.js child_process

**Decision**: Use Node.js `child_process` to execute git commands directly.

**Rationale**:
- ✅ Simple and straightforward
- ✅ No additional dependencies needed
- ✅ Full control over git commands
- ✅ Easy to parse output
- ✅ Works on all platforms (Windows, Mac, Linux)

**Alternatives Considered**:
- ❌ `simple-git` library: Adds dependency, abstracts too much
- ❌ `nodegit` (libgit2): Native bindings, complex, overkill
- ❌ Git HTTP API: Requires network, slower

## 4. Security Scanning: Regex Pattern Matching

**Decision**: Use regex patterns to detect sensitive data in code changes.

**Rationale**:
- ✅ Fast and efficient
- ✅ No external API calls needed
- ✅ Works offline
- ✅ Customizable patterns
- ✅ Low false positive rate with good patterns

**Alternatives Considered**:
- ❌ AI-based detection: Slower, costs tokens, less reliable
- ❌ External security APIs: Network dependency, rate limits
- ❌ Static analysis tools: Too heavy, complex integration

## 5. Risk Scoring: Weighted Multi-Factor Algorithm

**Decision**: Calculate risk score using weighted factors (security 40%, complexity 30%, change size 15%, critical files 15%).

**Rationale**:
- ✅ Transparent and explainable
- ✅ Adjustable weights for different projects
- ✅ Considers multiple risk dimensions
- ✅ Fast to calculate
- ✅ Easy to understand for developers

**Alternatives Considered**:
- ❌ AI-based risk assessment: Slower, less transparent
- ❌ Simple file count: Too simplistic, misses important factors
- ❌ ML model: Requires training data, overkill

## 6. Output Format: Markdown

**Decision**: Format all output as structured Markdown with sections, code blocks, and emojis.

**Rationale**:
- ✅ Bob renders Markdown beautifully
- ✅ Easy to read and scan
- ✅ Supports code syntax highlighting
- ✅ Can include links and formatting
- ✅ Copy-paste friendly for GitHub

**Alternatives Considered**:
- ❌ Plain text: Less readable, no formatting
- ❌ JSON: Not user-friendly for display
- ❌ HTML: Overkill, Bob doesn't render HTML

## 7. Configuration: Environment Variables

**Decision**: Use `.env` file for configuration (API keys, thresholds, etc.).

**Rationale**:
- ✅ Standard practice for sensitive data
- ✅ Easy to manage with `dotenv` package
- ✅ Keeps secrets out of code
- ✅ Different configs for dev/prod
- ✅ `.gitignore` prevents accidental commits

**Alternatives Considered**:
- ❌ Config file (JSON/YAML): Less secure for API keys
- ❌ Command-line args: Tedious, not persistent
- ❌ Hardcoded: Security risk, inflexible

## 8. Error Handling: Custom Error Classes

**Decision**: Create custom error classes for different error types (GitError, AIError, etc.).

**Rationale**:
- ✅ Type-safe error handling
- ✅ Clear error categorization
- ✅ Easy to add context and recovery suggestions
- ✅ Better debugging with stack traces
- ✅ Consistent error messages

**Alternatives Considered**:
- ❌ Generic Error: Less informative, harder to handle
- ❌ Error codes: Less TypeScript-friendly
- ❌ String errors: No type safety, no stack traces

## 9. Logging: Multi-Level File + Console

**Decision**: Log to both console (INFO+) and file (DEBUG+) with different levels.

**Rationale**:
- ✅ Console for user feedback
- ✅ File for debugging and troubleshooting
- ✅ Different verbosity levels for different needs
- ✅ Persistent logs for issue investigation
- ✅ Structured log format

**Alternatives Considered**:
- ❌ Console only: No persistent logs
- ❌ File only: No immediate user feedback
- ❌ External logging service: Overkill, costs money

## 10. Test Suggestions: Scenarios + Code Snippets

**Decision**: Generate both test scenarios (what to test) and code snippets (example implementations).

**Rationale**:
- ✅ Scenarios help developers think about edge cases
- ✅ Code snippets provide starting point
- ✅ Flexible: developers can use either or both
- ✅ Educational: shows testing best practices
- ✅ Time-saving: reduces boilerplate writing

**Alternatives Considered**:
- ❌ Scenarios only: Less actionable
- ❌ Code only: Misses high-level thinking
- ❌ Full test files: Too opinionated, may not match project style

## 11. TypeScript: Strict Mode

**Decision**: Use TypeScript with strict mode enabled.

**Rationale**:
- ✅ Catches errors at compile time
- ✅ Better IDE support and autocomplete
- ✅ Self-documenting code with types
- ✅ Easier refactoring
- ✅ Industry best practice

**Alternatives Considered**:
- ❌ JavaScript: Less type safety, more runtime errors
- ❌ TypeScript loose mode: Defeats purpose of TypeScript

## 12. Project Structure: Feature-Based

**Decision**: Organize code by feature (git/, security/, ai/, etc.) rather than by type (models/, controllers/, etc.).

**Rationale**:
- ✅ Related code stays together
- ✅ Easier to understand and navigate
- ✅ Better for modular development
- ✅ Scales well as project grows
- ✅ Clear separation of concerns

**Alternatives Considered**:
- ❌ Type-based: Scatters related code across directories
- ❌ Flat structure: Becomes messy as project grows
- ❌ Domain-driven: Overkill for this project size

## 13. Dependencies: Minimal

**Decision**: Keep dependencies minimal, prefer Node.js built-ins when possible.

**Rationale**:
- ✅ Faster installation
- ✅ Smaller bundle size
- ✅ Fewer security vulnerabilities
- ✅ Less maintenance burden
- ✅ Better performance

**Key Dependencies**:
- `@ibm-cloud/watsonx-ai`: Required for AI integration
- `dotenv`: Standard for environment variables
- `chalk`: Better console output (optional)
- `ora`: Loading spinners (optional)

**Avoided Dependencies**:
- ❌ `simple-git`: Can use child_process instead
- ❌ `axios`: Can use native fetch
- ❌ `lodash`: Can use native JS methods
- ❌ Heavy frameworks: Not needed for this tool

## 14. GitHub Integration: Content Generation Only

**Decision**: Generate PR content but don't automatically create PRs on GitHub.

**Rationale**:
- ✅ Gives developer control and review opportunity
- ✅ Avoids GitHub API authentication complexity
- ✅ No rate limiting issues
- ✅ Simpler implementation
- ✅ Safer: no accidental PR creation

**Alternatives Considered**:
- ❌ Auto-create PR: Risky, requires GitHub token, less control
- ❌ Open browser to PR page: Platform-dependent, complex

## 15. Performance Target: < 10 seconds

**Decision**: Target total execution time under 10 seconds for typical changes.

**Rationale**:
- ✅ Fast enough for good UX
- ✅ Realistic given AI API latency
- ✅ Allows for thorough analysis
- ✅ Acceptable wait time for developers
- ✅ Leaves room for optimization

**Breakdown**:
- Git diff: < 1s
- Security scan: < 1s
- AI generation: < 5s
- Risk calculation: < 0.5s
- Formatting: < 0.5s
- Buffer: 2s

## Summary

These technical decisions prioritize:
1. **Cost-effectiveness**: Free IBM watsonx.ai for students
2. **Simplicity**: Minimal dependencies, straightforward architecture
3. **User Experience**: Fast, clear output, easy to use
4. **Security**: Safe handling of sensitive data
5. **Maintainability**: Clean code structure, good error handling
6. **Flexibility**: Configurable, extensible design

All decisions can be revisited as the project evolves and requirements change.