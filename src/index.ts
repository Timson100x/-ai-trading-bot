import { TradingBot } from './TradingBot';
import { logger } from './utils/logger';

async function main() {
  logger.info('Starting AI Trading Bot...');

  const bot = new TradingBot();

  try {
    await bot.start();

    // Handle graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      await bot.stop();
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // Keep the process alive
    logger.info('Bot is running. Press Ctrl+C to stop.');

    // Example: Execute a sniper trade (commented out for safety)
    // setTimeout(async () => {
    //   const tokenAddress = 'YOUR_TOKEN_ADDRESS_HERE';
    //   await bot.executeTrade(tokenAddress, 'sniper', 0.1);
    // }, 5000);

  } catch (error) {
    logger.error('Fatal error in main', { error });
    process.exit(1);
  }
}

// Run the bot
main().catch((error) => {
  logger.error('Unhandled error', { error });
  process.exit(1);
});
