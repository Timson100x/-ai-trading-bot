# Quick Start Guide

This guide will help you get the AI Trading Bot up and running quickly.

## Prerequisites

- Node.js 20+
- Docker and Docker Compose (recommended)
- A Solana wallet with some SOL
- Anthropic API key (for Claude AI)

## Installation Steps

### Option 1: Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd -ai-trading-bot
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   nano .env  # or use your preferred editor
   ```

   Minimum required configuration:
   ```env
   # Required
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   WALLET_PRIVATE_KEYS=your_base58_private_key

   # Optional but recommended
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token
   TELEGRAM_CHAT_ID=your_telegram_chat_id
   ```

3. **Deploy with one command**
   ```bash
   sudo ./deploy.sh
   ```

   This will:
   - Install Docker if needed
   - Set up the environment
   - Build and start all services

4. **Check status**
   ```bash
   docker-compose ps
   docker-compose logs -f trading-bot
   ```

### Option 2: Local Development

1. **Clone and install**
   ```bash
   git clone <repository-url>
   cd -ai-trading-bot
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   nano .env
   ```

3. **Start Redis** (in a separate terminal)
   ```bash
   redis-server
   ```

4. **Build and run**
   ```bash
   npm run build
   npm start
   
   # OR for development with hot reload
   npm run dev
   ```

## Configuration

### Essential Settings

```env
# Wallet Configuration
WALLET_PRIVATE_KEYS=key1,key2,key3  # Comma-separated for rotation

# Trading Limits (start conservative!)
MAX_TRADE_AMOUNT=0.1  # Maximum 0.1 SOL per trade
MIN_TRADE_AMOUNT=0.01

# Risk Profile
RISK_PROFILE=conservative  # Options: conservative, moderate, aggressive
```

### Getting API Keys

#### Anthropic API Key
1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Navigate to API Keys
4. Create a new key
5. Copy and paste into `.env`

#### Telegram Bot (Optional but Recommended)
1. Open Telegram and search for @BotFather
2. Send `/newbot` and follow instructions
3. Copy the bot token to `TELEGRAM_BOT_TOKEN`
4. Start a chat with your bot
5. Send a message
6. Get your chat ID from https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
7. Copy the chat ID to `TELEGRAM_CHAT_ID`

## Testing

### Start Small

**⚠️ Important: Always test with small amounts first!**

```env
# Use conservative limits for testing
MAX_TRADE_AMOUNT=0.01  # Just 0.01 SOL per trade
RISK_PROFILE=conservative
```

### Monitor Logs

```bash
# Docker
docker-compose logs -f trading-bot

# PM2
pm2 logs ai-trading-bot

# Direct
tail -f logs/combined.log
```

### Check Status

The bot logs its status on startup:
```
Trading Bot initialized successfully
Initialized 5 trading strategies
Trading bot started successfully
```

## Using the Bot

### Available Strategies

The bot includes 5 strategies (all enabled by default):

1. **Sniper** - Fast execution on promising tokens
2. **Copy Trading** - Follow whale wallets
3. **Arbitrage** - Profit from price differences across DEXs
4. **Scalping** - Quick profits on volatility
5. **Liquidity Provision** - Earn from providing liquidity

### Executing Trades

The bot automatically monitors and executes trades based on:
- AI token scoring
- Strategy conditions
- Risk management rules

You can also manually trigger trades by modifying `src/index.ts`:

```typescript
// Example: Execute a sniper trade
setTimeout(async () => {
  const tokenAddress = 'YOUR_TOKEN_MINT_ADDRESS';
  await bot.executeTrade(tokenAddress, 'sniper', 0.1);
}, 5000);
```

## Monitoring

### Telegram Alerts

If configured, you'll receive:
- 🤖 Bot startup/shutdown
- 💼 Trade execution updates
- 🚨 Error notifications
- 🐋 Whale activity alerts
- 📊 Daily summaries

### Logs

Check logs regularly:
```bash
# View recent errors
grep ERROR logs/error.log | tail -20

# View trade activity
grep "trade" logs/combined.log | tail -20

# Monitor in real-time
tail -f logs/combined.log
```

### Health Checks

The bot runs automatic health checks every minute, monitoring:
- Redis connection
- RPC connectivity
- Active trades
- Wallet status

## Common Commands

### Docker

```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# Restart
docker-compose restart

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

### PM2

```bash
# Start
npm run pm2:start

# Stop
npm run pm2:stop

# Restart
npm run pm2:restart

# View logs
npm run pm2:logs

# Monitor
npm run pm2:monit
```

## Troubleshooting

### Bot Won't Start

1. **Check logs** for error messages
2. **Verify configuration** in `.env`
3. **Ensure Redis is running**
4. **Check API keys** are valid
5. **Verify wallet keys** are in base58 format

### No Trades Executing

1. **Check strategy conditions** - They may not be met
2. **Review risk limits** - Position limits may be reached
3. **Check wallet balance** - Ensure sufficient SOL
4. **Monitor logs** for decision details

### Redis Connection Failed

```bash
# Check if Redis is running
redis-cli ping
# Should return "PONG"

# Restart Redis
docker-compose restart redis
# OR
sudo systemctl restart redis
```

### RPC Errors

The bot automatically fails over to backup RPCs. If all fail:
1. Check internet connectivity
2. Try different RPC endpoints in `.env`
3. Check if endpoints are rate-limiting

## Safety Tips

✅ **DO**:
- Start with small amounts
- Use testnet first if possible
- Monitor logs regularly
- Set conservative limits initially
- Enable Telegram alerts
- Keep backups of wallet keys

❌ **DON'T**:
- Use your main wallet initially
- Set high trade limits before testing
- Ignore error messages
- Run without monitoring
- Commit `.env` to version control

## Next Steps

1. **Read the full README** - More detailed information
2. **Review SECURITY.md** - Security best practices
3. **Check CONTRIBUTING.md** - If you want to contribute
4. **Join the community** - Get help and share experiences

## Getting Help

- 📖 Read the full [README.md](README.md)
- 🔒 Review [SECURITY.md](SECURITY.md)
- 🐛 Check [Issues](https://github.com/Timson100x/-ai-trading-bot/issues)
- 💬 Ask questions in Discussions

## Example Session

Here's what a successful startup looks like:

```
$ docker-compose up -d
Creating network "ai-trading-bot_default" with the default driver
Creating trading-bot-redis ... done
Creating ai-trading-bot     ... done

$ docker-compose logs -f trading-bot
ai-trading-bot    | Trading Bot initialized successfully
ai-trading-bot    | Initialized 5 trading strategies
ai-trading-bot    | Redis connected successfully
ai-trading-bot    | Wallet loaded (index: 0, publicKey: ABC123...)
ai-trading-bot    | Trading bot started successfully
ai-trading-bot    | Bot is running. Press Ctrl+C to stop.
```

That's it! You're ready to start trading. Good luck! 🚀

---

**Remember**: Always trade responsibly and never invest more than you can afford to lose.
