# AI-Powered Solana Trading Bot

A production-ready, modular AI trading bot for Solana with advanced features including Smart Order Routing, whale tracking, and AI-driven token scoring.

## 🚀 Features

### Core Functionalities
- **AI Token Scoring**: Uses Claude AI to assess risk/reward profiles and rank tokens dynamically
- **Multiple Trading Strategies**:
  - **Sniper**: Fast execution on new token launches with high potential
  - **Copy Trading**: Follow whale wallets and replicate their trades
  - **Arbitrage**: Detect and execute arbitrage opportunities across DEXs
  - **Scalping**: Quick trades on small price movements
  - **Liquidity Provision**: Automated liquidity management
- **Smart Order Routing (SOR)**: Compares prices across Jupiter, Orca, and Raydium to get best execution
- **Whale Tracking**: Monitor large wallet transactions for trading signals

### Risk Management
- Maximum per-trade limits enforcement
- Dynamic position sizing based on AI-analyzed trading patterns
- Stop-loss and take-profit automation
- Trade cooldown periods
- Concurrent trade limits

### Infrastructure
- **Redis Caching**: Low-latency data access and caching
- **RPC Fallback**: Automatic failover between multiple RPC endpoints
- **Wallet Rotation**: Periodic wallet switching for operational security
- **Self-Healing**: Automatic recovery from failures

### Monitoring & Alerts
- **Telegram Integration**: Real-time trade notifications, error alerts, and daily summaries
- **Structured Logging**: JSON/text format logs for analysis
- **Health Checks**: Continuous system monitoring
- **Performance Metrics**: Track success rates and profitability

## 📋 Prerequisites

- Node.js 20+ 
- Docker & Docker Compose
- Redis (or use included Docker setup)
- Solana wallet with private key(s)
- Anthropic API key (for Claude AI)
- Telegram bot token (optional, for notifications)

## 🔧 Installation

### Quick Start with Docker (Recommended)

1. **Clone the repository**
```bash
git clone <repository-url>
cd -ai-trading-bot
```

2. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your API keys and wallet private keys
nano .env
```

3. **Deploy with one command**
```bash
sudo ./deploy.sh
```

This script will:
- Install Docker and Docker Compose if needed
- Set up the environment
- Build and start all services
- Configure firewall rules

### Manual Installation

1. **Install dependencies**
```bash
npm install
```

2. **Build TypeScript**
```bash
npm run build
```

3. **Start Redis** (if not using Docker)
```bash
redis-server
```

4. **Run the bot**
```bash
npm start
# OR with PM2
npm run pm2:start
```

## ⚙️ Configuration

### Environment Variables

Edit `.env` file with your configuration:

```env
# Required
ANTHROPIC_API_KEY=your_anthropic_api_key
WALLET_PRIVATE_KEYS=key1,key2,key3

# RPC Endpoints
SOLANA_RPC_PRIMARY=https://api.mainnet-beta.solana.com
SOLANA_RPC_FALLBACK_1=https://solana-api.projectserum.com

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Telegram (optional)
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# Trading Limits
MAX_TRADE_AMOUNT=1.0
MIN_TRADE_AMOUNT=0.01
SLIPPAGE_TOLERANCE=0.01

# Risk Profile
RISK_PROFILE=moderate  # conservative | moderate | aggressive
```

### Risk Profiles

- **Conservative**: Lower position sizes, tighter stop-loss, 3 concurrent trades max
- **Moderate**: Balanced risk/reward, 5 concurrent trades max (default)
- **Aggressive**: Higher risk tolerance, 10 concurrent trades max

## 🐳 Docker Deployment

### Using Docker Compose

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Restart
docker-compose restart
```

### Using PM2 (without Docker)

```bash
# Start
npm run pm2:start

# View logs
npm run pm2:logs

# Monitor
npm run pm2:monit

# Stop
npm run pm2:stop

# Restart
npm run pm2:restart
```

## 📁 Project Structure

```
├── src/
│   ├── config/           # Configuration management
│   ├── services/         # Core services
│   │   ├── AIService.ts              # Claude AI integration
│   │   ├── CacheService.ts           # Redis caching
│   │   ├── RPCService.ts             # Solana RPC with fallback
│   │   ├── WalletService.ts          # Wallet management
│   │   ├── TelegramService.ts        # Notifications
│   │   ├── SmartOrderRoutingService.ts  # DEX aggregation
│   │   └── RiskManagementService.ts  # Risk controls
│   ├── strategies/       # Trading strategies
│   │   ├── BaseStrategy.ts
│   │   ├── SniperStrategy.ts
│   │   ├── CopyTradingStrategy.ts
│   │   └── ArbitrageStrategy.ts
│   ├── types/            # TypeScript definitions
│   ├── utils/            # Utilities (logging, etc.)
│   ├── TradingBot.ts     # Main orchestrator
│   └── index.ts          # Entry point
├── Dockerfile
├── docker-compose.yml
├── deploy.sh             # Deployment script
├── ecosystem.config.json # PM2 configuration
└── package.json
```

## 🔒 Security

### Best Practices

1. **Never commit `.env` file** - It contains sensitive keys
2. **Use wallet rotation** - Configure multiple wallets for better security
3. **Set appropriate trade limits** - Start with small amounts
4. **Monitor logs regularly** - Check for suspicious activity
5. **Keep keys encrypted** - Consider using hardware wallets for production

### Environment Encryption (Optional)

You can encrypt your `.env` file:

```bash
# Encrypt
openssl enc -aes-256-cbc -salt -in .env -out .env.encrypted

# Decrypt
openssl enc -aes-256-cbc -d -in .env.encrypted -out .env
```

## 📊 Monitoring

### Telegram Alerts

The bot sends:
- 🤖 Startup/shutdown notifications
- 💼 Trade execution updates
- 🚨 Error alerts
- 🐋 Whale activity detection
- 📊 Daily trading summaries

### Logs

Logs are stored in `logs/` directory:
- `combined.log` - All logs
- `error.log` - Error logs only

View logs:
```bash
# Docker
docker-compose logs -f trading-bot

# PM2
pm2 logs ai-trading-bot

# Direct file
tail -f logs/combined.log
```

## 🎯 Usage Examples

### Execute a Sniper Trade

```typescript
// In src/index.ts
const bot = new TradingBot();
await bot.start();

const tokenAddress = 'YourTokenMintAddress';
const amount = 0.1; // SOL
await bot.executeTrade(tokenAddress, 'sniper', amount);
```

### Check Bot Status

```typescript
const status = bot.getStatus();
console.log(status);
// {
//   running: true,
//   activeTrades: 3,
//   strategies: ['sniper', 'copy_trading', 'arbitrage'],
//   riskProfile: 'moderate',
//   walletCount: 2
// }
```

## 🔧 Development

### Run in Development Mode

```bash
npm run dev
```

This uses `nodemon` and `ts-node` for hot reloading.

### Build

```bash
npm run build
```

Compiles TypeScript to JavaScript in `dist/` directory.

## 🐛 Troubleshooting

### Redis Connection Issues

```bash
# Check if Redis is running
docker-compose ps
# OR
redis-cli ping
```

### RPC Errors

The bot automatically fails over to backup RPCs. Check logs:
```bash
docker-compose logs -f trading-bot | grep RPC
```

### Wallet Issues

Ensure private keys are in base58 format:
```bash
# Convert if needed using Solana CLI
solana-keygen recover -o wallet.json
```

## 📈 Performance Optimization

1. **Redis Tuning**: Adjust `CACHE_TTL_SECONDS` for your needs
2. **RPC Selection**: Use premium RPC providers for lower latency
3. **Concurrent Trades**: Adjust based on capital and risk tolerance
4. **Strategy Selection**: Enable only strategies you need

## 🚨 Disclaimer

**This software is for educational purposes only. Trading cryptocurrencies carries significant risk. Use at your own risk.**

- Always test with small amounts first
- Never invest more than you can afford to lose
- Past performance does not guarantee future results
- The developers are not responsible for any financial losses

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📞 Support

For issues and questions:
- Open a GitHub issue
- Check existing documentation
- Review logs for error messages

## 🗺️ Roadmap

- [ ] Add more trading strategies (scalping, LP provision)
- [ ] Web dashboard for monitoring
- [ ] Backtesting framework
- [ ] Machine learning model integration
- [ ] Multi-chain support
- [ ] Advanced order types
- [ ] Portfolio management

---

**Built with ❤️ for the Solana ecosystem**
