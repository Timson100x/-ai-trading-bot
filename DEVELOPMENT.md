# Development Guide

This guide covers local development, testing, and contribution workflow.

## Development Environment Setup

### Prerequisites

- Node.js 20+
- Redis
- Git
- Code editor (VS Code recommended)

### Initial Setup

```bash
# Clone repository
git clone <repo-url>
cd -ai-trading-bot

# Install dependencies
npm install

# Copy environment config
cp .env.example .env

# Edit with your test credentials
nano .env
```

### Start Redis Locally

**macOS (Homebrew)**
```bash
brew install redis
brew services start redis
```

**Linux (Ubuntu/Debian)**
```bash
sudo apt-get install redis-server
sudo systemctl start redis
```

**Docker**
```bash
docker run -d -p 6379:6379 redis:7-alpine
```

### Development Mode

```bash
# Start with hot reload
npm run dev

# This will:
# - Watch for file changes
# - Automatically restart on changes
# - Use ts-node for direct TypeScript execution
```

## Project Structure Deep Dive

```
src/
├── config/
│   └── index.ts              # Centralized configuration
├── services/
│   ├── AIService.ts          # Claude AI integration
│   ├── CacheService.ts       # Redis caching layer
│   ├── MempoolService.ts     # Mempool monitoring
│   ├── RPCService.ts         # Solana RPC with fallback
│   ├── RiskManagementService.ts  # Trade risk controls
│   ├── SmartOrderRoutingService.ts  # DEX aggregation
│   ├── TelegramService.ts    # Notifications
│   └── WalletService.ts      # Wallet management
├── strategies/
│   ├── BaseStrategy.ts       # Abstract base class
│   ├── SniperStrategy.ts     # Snipe new tokens
│   ├── CopyTradingStrategy.ts  # Follow whales
│   ├── ArbitrageStrategy.ts  # Cross-DEX arbitrage
│   ├── ScalpingStrategy.ts   # Quick scalp trades
│   └── LiquidityProvisionStrategy.ts  # LP farming
├── types/
│   └── index.ts              # TypeScript interfaces
├── utils/
│   └── logger.ts             # Winston logger setup
├── TradingBot.ts             # Main bot orchestrator
└── index.ts                  # Entry point
```

## Code Standards

### TypeScript

```typescript
// Good: Proper typing
interface TradeParams {
  tokenAddress: string;
  amount: number;
  strategy: TradingStrategy;
}

async function executeTrade(params: TradeParams): Promise<Trade | null> {
  // Implementation
}

// Bad: Using any
async function executeTrade(params: any): Promise<any> {
  // Implementation
}
```

### Error Handling

```typescript
// Good: Structured error handling
try {
  const result = await riskyOperation();
  logger.info('Operation completed', { result });
  return result;
} catch (error) {
  logger.error('Operation failed', {
    operation: 'riskyOperation',
    error: error instanceof Error ? error.message : 'Unknown error'
  });
  throw new Error(`Failed to complete operation: ${error}`);
}

// Bad: Silent failures
try {
  await riskyOperation();
} catch (error) {
  // Nothing
}
```

### Logging

```typescript
// Good: Structured logging with context
logger.info('Trade executed', {
  tokenAddress: trade.tokenAddress,
  amount: trade.amount,
  strategy: trade.strategy,
  tradeId: trade.id
});

// Bad: String concatenation
logger.info('Trade executed: ' + trade.tokenAddress + ' amount: ' + trade.amount);
```

## Testing Strategies

### Manual Testing

1. **Use Test Wallet**
   - Create a dedicated test wallet
   - Fund with small amounts
   - Never use your main wallet

2. **Start with Conservative Settings**
   ```env
   MAX_TRADE_AMOUNT=0.01
   RISK_PROFILE=conservative
   MAX_CONCURRENT_TRADES=1
   ```

3. **Enable Detailed Logging**
   ```env
   LOG_LEVEL=debug
   LOG_FORMAT=text  # Easier to read during development
   ```

4. **Monitor Everything**
   ```bash
   # Terminal 1: Bot
   npm run dev
   
   # Terminal 2: Logs
   tail -f logs/combined.log
   
   # Terminal 3: Redis
   redis-cli monitor
   ```

### Testing Individual Components

```typescript
// Test AI Service
const aiService = new AIService(cache);
const score = await aiService.scoreToken(
  'So11111111111111111111111111111111111111112',
  'SOL',
  { price: 100, volume24h: 1000000 }
);
console.log('Token score:', score);

// Test SOR
const sorService = new SmartOrderRoutingService(cache);
const quote = await sorService.getBestQuote(
  'SOL_MINT',
  'TOKEN_MINT',
  0.1
);
console.log('Best quote:', quote);
```

### Testing Strategies

```typescript
// In src/index.ts or a test file
const strategy = new SniperStrategy(
  connection,
  walletService,
  aiService,
  sorService,
  cache
);

// Test evaluation
const shouldExecute = await strategy.shouldExecute('TOKEN_ADDRESS');
console.log('Should execute:', shouldExecute);

// Test execution (with very small amount!)
if (shouldExecute) {
  const trade = await strategy.execute('TOKEN_ADDRESS', 0.01);
  console.log('Trade result:', trade);
}
```

## Debugging

### Common Issues

1. **Module Resolution Errors**
   ```bash
   # Clean and rebuild
   rm -rf dist/
   npm run build
   ```

2. **Redis Connection Failed**
   ```bash
   # Check if Redis is running
   redis-cli ping
   # Should return "PONG"
   
   # Check connection
   redis-cli -h localhost -p 6379
   ```

3. **RPC Errors**
   ```typescript
   // Add more detailed logging in RPCService
   logger.debug('RPC request', { endpoint, method });
   ```

4. **TypeScript Errors**
   ```bash
   # Check compilation without building
   npx tsc --noEmit
   ```

### VS Code Debugging

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Bot",
      "runtimeArgs": ["-r", "ts-node/register"],
      "args": ["${workspaceFolder}/src/index.ts"],
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal"
    }
  ]
}
```

Press F5 to start debugging.

## Performance Profiling

### Memory Usage

```typescript
// Add to index.ts
setInterval(() => {
  const usage = process.memoryUsage();
  logger.debug('Memory usage', {
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + 'MB',
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + 'MB'
  });
}, 60000); // Every minute
```

### Response Times

```typescript
// Add timing to critical operations
const start = Date.now();
const result = await operation();
const duration = Date.now() - start;
logger.debug('Operation completed', { operation: 'name', duration });
```

## Git Workflow

### Branch Naming

```
feature/add-new-strategy
fix/redis-connection-issue
docs/update-readme
refactor/improve-caching
```

### Commit Messages

```
feat: add momentum trading strategy
fix: resolve race condition in wallet rotation
docs: update configuration examples
refactor: extract common strategy logic
test: add unit tests for AI service
chore: update dependencies
```

### Before Committing

```bash
# Build to check for errors
npm run build

# Check for obvious issues
grep -r "console.log" src/  # Remove debug logs
grep -r "any" src/          # Check for type issues

# Format code (if you have prettier)
npm run format
```

## Adding a New Strategy

Step-by-step guide:

1. **Create Strategy File**
   ```bash
   touch src/strategies/MomentumStrategy.ts
   ```

2. **Implement Strategy**
   ```typescript
   import { BaseStrategy } from './BaseStrategy';
   import { Trade, TradingStrategy } from '../types';
   
   export class MomentumStrategy extends BaseStrategy {
     name: TradingStrategy = 'momentum';
     
     async shouldExecute(tokenAddress: string): Promise<boolean> {
       // Your logic here
       return false;
     }
     
     async execute(tokenAddress: string, amount: number): Promise<Trade | null> {
       // Your execution logic here
       return null;
     }
   }
   ```

3. **Register in TradingBot**
   ```typescript
   // In src/TradingBot.ts
   import { MomentumStrategy } from './strategies/MomentumStrategy';
   
   // In initializeStrategies()
   const momentum = new MomentumStrategy(...strategyArgs);
   this.strategies.set(momentum.name, momentum);
   ```

4. **Update Types** (if needed)
   ```typescript
   // In src/types/index.ts
   export type TradingStrategy = 
     | 'sniper' 
     | 'copy_trading'
     | 'momentum'  // Add new strategy
     // ...
   ```

5. **Test**
   ```bash
   npm run dev
   ```

6. **Document**
   - Add to README.md
   - Add configuration options
   - Add usage examples

## Useful Commands

```bash
# Development
npm run dev              # Start with hot reload
npm run build            # Build TypeScript
npm start                # Run built code

# Process Management
npm run pm2:start        # Start with PM2
npm run pm2:stop         # Stop PM2
npm run pm2:logs         # View logs
npm run pm2:monit        # Monitor with PM2

# Docker
npm run docker:build     # Build Docker image
npm run docker:up        # Start containers
npm run docker:down      # Stop containers
npm run docker:logs      # View logs

# Utilities
npx tsc --noEmit        # Check types without building
redis-cli flushall      # Clear Redis cache (careful!)
pm2 flush               # Clear PM2 logs
```

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Solana Web3.js Docs](https://solana-labs.github.io/solana-web3.js/)
- [Winston Logger Docs](https://github.com/winstonjs/winston)
- [Redis Commands](https://redis.io/commands/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

## Getting Help

- Review existing code for patterns
- Check logs for detailed error messages
- Ask questions in Discussions
- Open issues for bugs

Happy coding! 🚀
