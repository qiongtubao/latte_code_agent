# Latte Code Agent

<div align="center">

A TypeScript-based code generation agent powered by Latte, Claude, and Trae models.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-green)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

## 📖 Overview

Latte Code Agent is an intelligent code generation agent that leverages AI models to automatically generate code based on project requirements. It follows the best practices from [Anthropic's long-running agents research](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) to handle complex, multi-step coding tasks across multiple context windows.

This project is **self-bootstrapping** - it uses latte-code-agent to upgrade itself!

## ✨ Features

- **🤖 Multi-Model Support**: Integrates with Claude, Trae, and Latte models
- **📋 Smart Task Management**: Automatically parses requirements and creates feature lists
- **🔄 Incremental Development**: Works on one feature at a time with proper testing
- **📊 Progress Tracking**: Maintains detailed progress logs and state management
- **🧪 Comprehensive Testing**: Supports unit, integration, and E2E tests
- **🔀 Git Integration**: Automatic commits with clear messages
- **⚡ Parallel Execution**: Supports parallel task execution for independent features

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd latte-code-agent

# Install dependencies
npm install

# Build the project
npm run build

# Link globally (optional)
npm link
```

### Basic Usage

```bash
# Initialize a project
latte-code-agent init

# Run a single task
latte-code-agent run

# Run with specific model
latte-code-agent run -m trae

# Run specific feature
latte-code-agent run -f F001

# Loop through all tasks
latte-code-agent loop

# Run tests
latte-code-agent test

# Check project status
latte-code-agent status
```

## 📁 Project Structure

```
latte-code-agent/
├── src/
│   ├── agents/          # Agent implementations
│   │   ├── BaseAgent.ts
│   │   ├── ClaudeAgent.ts
│   │   ├── TraeAgent.ts
│   │   └── LatteAgent.ts
│   ├── cli/             # CLI commands
│   │   ├── init.ts
│   │   ├── run.ts
│   │   ├── loop.ts
│   │   └── test.ts
│   ├── core/            # Core functionality
│   │   ├── StateManager.ts
│   │   ├── FeatureManager.ts
│   │   └── TestManager.ts
│   ├── models/          # Data models and schemas
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   └── __tests__/       # Test files
├── docs/                # Documentation
├── .latte/              # Agent state files (generated)
├── LATTE.md             # Project requirements
└── package.json
```

## 🔧 Configuration

### LATTE.md Format

Create a `LATTE.md` file in your project root:

```markdown
# Project Name

## Project Description
[Your project description]

## Tech Stack
- Language: TypeScript
- Framework: [framework name]
- Testing: Jest

## Features
### Feature 1: Feature Name
- Step 1
- Step 2
- Step 3

### Feature 2: Another Feature
- Step 1
- Step 2

## Acceptance Criteria
- [ ] All tests pass
- [ ] Code coverage > 80%
- [ ] No critical bugs
```

### Environment Variables

Create a `.env` file:

```env
ANTHROPIC_API_KEY=your_claude_api_key
TRAE_API_KEY=your_trae_api_key
LATTE_API_KEY=your_latte_api_key
```

## 📊 State Management

The agent maintains several state files in `.latte/` directory:

- **feature_list.json**: List of all features with status
- **progress.md**: Detailed progress log
- **state.json**: Agent state and statistics

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 📝 Development

```bash
# Development mode
npm run dev

# Build
npm run build

# Lint code
npm run lint

# Format code
npm run format
```

## 🎯 How It Works

1. **Initialization**: The agent reads `LATTE.md` and creates a feature list
2. **Task Selection**: Selects the highest priority pending task
3. **Code Generation**: Uses AI models to implement the feature
4. **Testing**: Runs tests to verify the implementation
5. **Commit**: Commits changes with descriptive messages
6. **Progress Update**: Updates progress files and moves to next task

## 🔄 Self-Bootstrap

This project can upgrade itself! After initialization:

```bash
# Initialize the project
npm run dev init

# Let the agent improve itself
npm run dev loop
```

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- [Anthropic](https://www.anthropic.com/) for the long-running agents research
- [Claude](https://www.anthropic.com/claude) for AI capabilities
- [Trae](https://trae.ai/) for AI integration

## 📚 Documentation

- [Detailed Design Document](docs/steps.md)
- [API Documentation](docs/api.md) (coming soon)
- [Examples](docs/examples.md) (coming soon)

## ⚠️ Current Status

This project is in **active development**. Core features are implemented:

- ✅ CLI framework
- ✅ State management
- ✅ Claude API integration
- ✅ Basic Trae integration
- ✅ Test framework
- ⏳ Latte model integration (placeholder)
- ⏳ Advanced features

## 🐛 Known Issues

- Test cases need adjustment for actual project state
- Trae integration needs more robust error handling
- Latte model integration is a placeholder

## 🗺️ Roadmap

- [ ] Complete Latte model integration
- [ ] Add more comprehensive test cases
- [ ] Implement parallel task execution
- [ ] Add web UI for monitoring
- [ ] Support for more AI models
- [ ] Plugin system for custom agents

---

<div align="center">
Made with ❤️ by the Latte Code Agent Team
</div>
