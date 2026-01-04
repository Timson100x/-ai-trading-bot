# Contributing to AI Trading Bot

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Adding New Features](#adding-new-features)

## Code of Conduct

Be respectful and professional in all interactions. We aim to foster an inclusive and welcoming community.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/-ai-trading-bot.git
   cd -ai-trading-bot
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/Timson100x/-ai-trading-bot.git
   ```

## Development Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment**:
   ```bash
   cp .env.example .env
   # Edit .env with test credentials (use testnet!)
   ```

3. **Build the project**:
   ```bash
   npm run build
   ```

4. **Run in development mode**:
   ```bash
   npm run dev
   ```

## Project Structure

```
src/
├── config/           # Configuration management
├── services/         # Core services (AI, RPC, Cache, etc.)
├── strategies/       # Trading strategies
├── types/            # TypeScript type definitions
├── utils/            # Utility functions
├── TradingBot.ts     # Main bot orchestrator
└── index.ts          # Entry point
```

### Adding New Services

Services are located in `src/services/`. To add a new service:

1. Create a new file: `src/services/YourService.ts`
2. Follow the existing service patterns
3. Add proper error handling and logging
4. Export from the service file
5. Initialize in `TradingBot.ts` if needed

### Adding New Strategies

Strategies are located in `src/strategies/`. To add a new strategy:

1. Create a new file: `src/strategies/YourStrategy.ts`
2. Extend `BaseStrategy` class
3. Implement required methods:
   - `shouldExecute(tokenAddress: string): Promise<boolean>`
   - `execute(tokenAddress: string, amount: number): Promise<Trade | null>`
4. Add proper logging and error handling
5. Register in `TradingBot.ts`

Example:

```typescript
import { BaseStrategy } from './BaseStrategy';
import { Trade, TradingStrategy } from '../types';

export class YourStrategy extends BaseStrategy {
  name: TradingStrategy = 'your_strategy';

  async shouldExecute(tokenAddress: string): Promise<boolean> {
    // Your logic here
    return true;
  }

  async execute(tokenAddress: string, amount: number): Promise<Trade | null> {
    // Your execution logic here
    return null;
  }
}
```

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Define proper types (avoid `any`)
- Use interfaces for complex objects
- Document public APIs with JSDoc comments

### Code Style

- Use 2 spaces for indentation
- Use semicolons
- Use single quotes for strings
- Maximum line length: 100 characters
- Use meaningful variable names

### Error Handling

Always include proper error handling:

```typescript
try {
  // Your code
} catch (error) {
  logger.error('Descriptive error message', { context, error });
  // Handle appropriately
}
```

### Logging

Use the provided logger:

```typescript
import { logger } from '../utils/logger';

logger.info('Operation completed', { data });
logger.warn('Warning message', { details });
logger.error('Error occurred', { error });
logger.debug('Debug info', { debug });
```

### Configuration

Add new config options to:
1. `.env.example` with description
2. `src/config/index.ts` with type safety
3. `README.md` documentation

### Async/Await

- Use async/await instead of callbacks
- Handle rejections properly
- Use Promise.all() for parallel operations
- Add timeouts for external calls

## Testing

While the project doesn't have a full test suite yet, please:

1. **Test manually** with small amounts on testnet
2. **Verify edge cases** (errors, timeouts, invalid inputs)
3. **Check logs** for warnings or errors
4. **Test with different configurations**

Future: We plan to add:
- Unit tests with Jest
- Integration tests
- Mocking for external services

## Submitting Changes

### Commit Messages

Use clear, descriptive commit messages:

```
Add scalping strategy with quick profit taking

- Implement entry/exit logic
- Add position monitoring
- Include profit/loss tracking
```

Format: `<type>: <description>`

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build/config changes

### Pull Request Process

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following coding standards

3. **Test thoroughly** (manual or automated)

4. **Update documentation** if needed

5. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: add your feature"
   ```

6. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Open a Pull Request** on GitHub

8. **Describe your changes**:
   - What does this PR do?
   - Why is this change needed?
   - How has it been tested?
   - Any breaking changes?

9. **Wait for review** and address feedback

### PR Requirements

- [ ] Code follows project style guidelines
- [ ] Changes are well-tested
- [ ] Documentation is updated
- [ ] Commit messages are clear
- [ ] No merge conflicts
- [ ] Builds successfully
- [ ] No new security vulnerabilities

## Adding New Features

### Strategy Development

When adding a new trading strategy:

1. Research the strategy thoroughly
2. Define clear entry/exit criteria
3. Implement risk management
4. Add proper logging
5. Test with paper trading first
6. Document the strategy in README

### Service Development

When adding a new service:

1. Define clear interface/contract
2. Handle errors gracefully
3. Add caching where appropriate
4. Implement health checks
5. Add monitoring/metrics
6. Document configuration options

### API Integration

When integrating new APIs:

1. Use axios for HTTP requests
2. Add timeout configuration
3. Implement retry logic
4. Cache responses appropriately
5. Handle rate limiting
6. Log all API calls
7. Add error handling

Example:

```typescript
async callExternalAPI(): Promise<Data> {
  try {
    const response = await axios.get(url, {
      timeout: 5000,
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    await this.cache.set(`key`, response.data, 300);
    return response.data;
  } catch (error) {
    logger.error('API call failed', { url, error });
    throw error;
  }
}
```

## Performance Considerations

- Use caching to reduce API calls
- Implement connection pooling
- Batch operations when possible
- Use indexes for database queries
- Profile performance-critical code
- Monitor memory usage

## Security Guidelines

- Never log sensitive data (keys, passwords)
- Validate all inputs
- Sanitize user-provided data
- Use parameterized queries
- Keep dependencies updated
- Follow OWASP guidelines

## Questions?

- Open an issue for bugs
- Start a discussion for feature requests
- Check existing issues/PRs first
- Be patient and respectful

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT License).

---

Thank you for contributing! 🚀
