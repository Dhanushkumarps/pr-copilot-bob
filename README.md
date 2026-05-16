# PR Copilot 🚀

AI-powered Pull Request assistant that analyzes your git changes and generates comprehensive PR documentation using IBM watsonx.ai Granite models.

## Features

✨ **Automated PR Analysis**
- 📊 Git diff parsing and analysis
- 🔒 Security vulnerability scanning
- 📈 Risk assessment with weighted scoring
- 🤖 AI-generated PR titles and descriptions
- 🧪 Intelligent test suggestions
- 📝 Beautiful markdown output with emojis

## Prerequisites

- Node.js 18+ and npm
- Git repository
- IBM Cloud account with watsonx.ai access

## Quick Start

### 1. Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd pr-copilot-bob

# Install dependencies
npm install

# Build TypeScript
npm run build
```

### 2. Configuration

Copy the example environment file and configure your credentials:

```bash
cp .env.example .env
```

Edit `.env` and add your IBM Cloud credentials:

```env
# Required: IBM watsonx.ai credentials
IBM_CLOUD_API_KEY=your-api-key-here
IBM_WATSONX_PROJECT_ID=your-project-id-here
IBM_WATSONX_URL=https://us-south.ml.cloud.ibm.com

# Optional: Customize behavior
LOG_LEVEL=INFO
OUTPUT_EMOJIS=true
RISK_THRESHOLD_HIGH=75
RISK_THRESHOLD_MEDIUM=40
```

**Getting IBM Cloud Credentials:**
1. Go to [IBM Cloud](https://cloud.ibm.com/)
2. Create an API key: IAM → API keys → Create
3. Create a watsonx.ai project and copy the Project ID

### 3. Usage

Run PR Copilot in your git repository:

```bash
# Full analysis with AI-generated content
node dist/index.js

# Quick summary without AI (faster)
node dist/index.js --quick

# Compare against specific branch
node dist/index.js --base develop

# Skip test suggestions
node dist/index.js --skip-tests

# Skip all AI features
node dist/index.js --skip-ai

# Verbose logging
node dist/index.js --verbose
```

## Command Line Options

| Option | Description |
|--------|-------------|
| `-b, --base <branch>` | Base branch to compare against (default: main) |
| `--skip-ai` | Skip AI-generated PR content |
| `--skip-tests` | Skip test suggestions |
| `-q, --quick` | Quick summary only (no AI) |
| `-v, --verbose` | Enable verbose logging |
| `-h, --help` | Show help message |

## Output Example

```markdown
🚀 # PR Readiness Analysis

**Files Changed:** 5 | **Lines:** +234 -89 | **Base:** main

## ⚠️ Risk Assessment

**Overall Risk:** MEDIUM (52/100)

### Risk Factors

🔒 **Security** (40% weight)
  - Score: 30.0/100
  - No critical security issues detected

🧩 **Complexity** (30% weight)
  - Score: 65.0/100
  - High complexity changes detected in 2 files

📦 **Change Size** (15% weight)
  - Score: 45.0/100
  - Moderate change size

🔴 **Critical Files** (15% weight)
  - Score: 80.0/100
  - 2 critical files modified

### 💡 Recommendations

- Review complex logic changes carefully
- Add unit tests for new functionality
- Consider splitting large changes

## 📝 Suggested PR Content

### Title

```
feat: Add AI-powered PR analysis with risk scoring
```

✅ Follows conventional commit format

### Description

**What Changed**

Added comprehensive PR analysis tool with security scanning,
risk assessment, and AI-generated documentation.

**Why**

To automate PR review preparation and improve code quality...

## 📊 Change Summary

**Modified (3):** src/index.ts, src/risk/assessor.ts, package.json
**Added (2):** src/formatters/output-formatter.ts, README.md

🔴 **Critical Files (2):** src/index.ts, package.json

## 🧪 Test Suggestions

**Total Suggestions:** 8
- Unit Tests: 5
- Integration Tests: 2
- E2E Tests: 1

### Unit Tests

1. Test risk score calculation with various inputs
   - Priority: ⭐⭐⭐
   - Verify weighted scoring algorithm produces correct results

...
```

## Architecture

```
pr-copilot-bob/
├── src/
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utilities (logger, config, errors)
│   ├── git/            # Git operations and diff parsing
│   ├── security/       # Security pattern scanning
│   ├── ai/             # IBM watsonx.ai integration
│   ├── generators/     # PR and test content generators
│   ├── risk/           # Risk assessment algorithms
│   ├── formatters/     # Output formatting
│   └── index.ts        # Main CLI entry point
├── .env                # Configuration (not in git)
└── package.json        # Dependencies
```

## Risk Scoring Algorithm

PR Copilot uses a weighted scoring system (0-100):

- **Security (40%)**: Scans for hardcoded secrets, API keys, credentials
- **Complexity (30%)**: Analyzes code complexity and change patterns
- **Change Size (15%)**: Evaluates number of files and lines changed
- **Critical Files (15%)**: Identifies changes to important files

**Risk Levels:**
- **LOW** (0-39): Safe to merge with standard review
- **MEDIUM** (40-74): Requires careful review
- **HIGH** (75-100): Needs thorough review and testing

## Configuration Options

All options can be set via environment variables in `.env`:

### IBM watsonx.ai
- `IBM_CLOUD_API_KEY` - Your IBM Cloud API key (required)
- `IBM_WATSONX_PROJECT_ID` - watsonx.ai project ID (required)
- `IBM_WATSONX_URL` - Service URL (default: us-south)

### Granite Model
- `GRANITE_MODEL_ID` - Model to use (default: ibm/granite-13b-chat-v2)
- `GRANITE_MAX_TOKENS` - Max response tokens (default: 2048)
- `GRANITE_TEMPERATURE` - Creativity (default: 0.7)
- `GRANITE_TOP_P` - Nucleus sampling (default: 0.95)

### Risk Assessment
- `RISK_THRESHOLD_HIGH` - High risk threshold (default: 75)
- `RISK_THRESHOLD_MEDIUM` - Medium risk threshold (default: 40)
- `RISK_WEIGHT_SECURITY` - Security weight (default: 0.4)
- `RISK_WEIGHT_COMPLEXITY` - Complexity weight (default: 0.3)
- `RISK_WEIGHT_CHANGE_SIZE` - Change size weight (default: 0.15)
- `RISK_WEIGHT_CRITICAL_FILES` - Critical files weight (default: 0.15)

### Output
- `OUTPUT_EMOJIS` - Use emojis in output (default: true)
- `OUTPUT_COLORS` - Use colors in output (default: true)
- `OUTPUT_MAX_TITLE_LENGTH` - Max PR title length (default: 72)

### Logging
- `LOG_LEVEL` - ERROR, WARN, INFO, DEBUG (default: INFO)
- `LOG_FILE` - Log file path (optional)
- `LOG_CONSOLE` - Console logging (default: true)

### Features
- `FEATURE_TEST_SUGGESTIONS` - Enable test suggestions (default: true)
- `FEATURE_TEST_CODE_SNIPPETS` - Include code snippets (default: true)
- `FEATURE_PR_DESCRIPTION` - Generate PR descriptions (default: true)
- `FEATURE_RISK_ASSESSMENT` - Enable risk assessment (default: true)

## Development

### Build

```bash
npm run build
```

### Type Check

```bash
npm run type-check
```

### Run Tests

```bash
npm test
```

### Development Mode

```bash
npm run dev
```

## Troubleshooting

### "Not a git repository" Error
Make sure you're running the command from within a git repository.

### "Missing required environment variable" Error
Check that your `.env` file exists and contains all required variables.

### "Authentication failed" Error
Verify your IBM Cloud API key and project ID are correct.

### "No changes detected" Error
Make sure you have committed changes or specify a different base branch.

## Security Notes

⚠️ **Important Security Practices:**

1. **Never commit `.env` file** - It contains sensitive credentials
2. **Use environment variables** - Don't hardcode API keys in code
3. **Rotate API keys regularly** - Update keys periodically
4. **Review security findings** - Fix any detected vulnerabilities before merging

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - See LICENSE file for details

## Support

For issues and questions:
- Open an issue on GitHub
- Check existing documentation
- Review IBM watsonx.ai documentation

## Acknowledgments

- Built with IBM watsonx.ai and Granite models
- Inspired by modern PR automation tools
- Made with ❤️ by Bob

---

**Made with Bob** 🤖