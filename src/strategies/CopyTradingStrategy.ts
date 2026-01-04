import { BaseStrategy } from './BaseStrategy';
import { Trade, TradingStrategy, WhaleTransaction } from '../types';
import { logger } from '../utils/logger';
import { Config } from '../config';
import { PublicKey } from '@solana/web3.js';

export class CopyTradingStrategy extends BaseStrategy {
  name: TradingStrategy = 'copy_trading';
  private monitoredWallets: Set<string>;

  constructor(...args: ConstructorParameters<typeof BaseStrategy>) {
    super(...args);
    this.monitoredWallets = new Set(Config.WHALE_WALLET_ADDRESSES);
    logger.info(`Copy trading monitoring ${this.monitoredWallets.size} whale wallets`);
  }

  async shouldExecute(tokenAddress: string): Promise<boolean> {
    try {
      // Check if any whale has recently bought this token
      const recentWhaleActivity = await this.checkWhaleActivity(tokenAddress);
      
      if (!recentWhaleActivity) {
        return false;
      }

      // Get AI score for additional validation
      const score = await this.aiService.scoreToken(tokenAddress, 'UNKNOWN', {});
      
      // Copy trade if whale bought and token score is reasonable
      const shouldCopy = recentWhaleActivity.type === 'buy' && 
                         score.riskScore < 70 &&
                         recentWhaleActivity.amount >= Config.MIN_WHALE_TRANSACTION_SIZE;
      
      logger.info('Copy trading evaluation', {
        tokenAddress,
        whaleAmount: recentWhaleActivity.amount,
        score: score.overallScore,
        shouldCopy
      });

      return shouldCopy;
    } catch (error) {
      logger.error('Copy trading shouldExecute error', { tokenAddress, error });
      return false;
    }
  }

  async execute(tokenAddress: string, amount: number): Promise<Trade | null> {
    try {
      logger.info('Executing copy trading strategy', { tokenAddress, amount });

      // Validate amount
      if (!await this.validateTradeAmount(amount)) {
        logger.warn('Insufficient balance for copy trade', { amount });
        return null;
      }

      // Get best quote
      const SOL_MINT = 'So11111111111111111111111111111111111111112';
      const quote = await this.sorService.getBestQuote(SOL_MINT, tokenAddress, amount);

      if (!quote) {
        logger.warn('No quote available for copy trade', { tokenAddress });
        return null;
      }

      // Create trade record
      const trade: Trade = {
        id: this.generateTradeId(),
        tokenAddress,
        type: 'buy',
        amount,
        price: quote.outAmount / quote.inAmount,
        strategy: this.name,
        status: 'pending',
        timestamp: Date.now()
      };

      logger.info('Copy trade created', { trade });

      return trade;
    } catch (error) {
      logger.error('Copy trading strategy execution error', { tokenAddress, error });
      return null;
    }
  }

  private async checkWhaleActivity(tokenAddress: string): Promise<WhaleTransaction | null> {
    try {
      // Check cache for recent whale transactions
      for (const walletAddress of this.monitoredWallets) {
        const cacheKey = `whale:${walletAddress}:${tokenAddress}`;
        const activity = await this.cache.get<WhaleTransaction>(cacheKey);
        
        if (activity && Date.now() - activity.timestamp < 300000) { // Within 5 minutes
          return activity;
        }
      }

      return null;
    } catch (error) {
      logger.error('Error checking whale activity', { tokenAddress, error });
      return null;
    }
  }

  async monitorWhaleTrade(
    walletAddress: string,
    tokenAddress: string,
    amount: number,
    type: 'buy' | 'sell'
  ): Promise<void> {
    if (!this.monitoredWallets.has(walletAddress)) {
      return;
    }

    const transaction: WhaleTransaction = {
      signature: '',
      walletAddress,
      tokenAddress,
      amount,
      type,
      timestamp: Date.now()
    };

    // Cache the whale activity
    const cacheKey = `whale:${walletAddress}:${tokenAddress}`;
    await this.cache.set(cacheKey, transaction, 600); // 10 minutes

    logger.info('Whale activity detected', { 
      walletAddress: walletAddress.substring(0, 8) + '...',
      tokenAddress: tokenAddress.substring(0, 8) + '...',
      amount,
      type
    });
  }
}
