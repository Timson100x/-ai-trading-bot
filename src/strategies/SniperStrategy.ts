import { BaseStrategy } from './BaseStrategy';
import { Trade, TradingStrategy } from '../types';
import { logger } from '../utils/logger';
import { Config } from '../config';

export class SniperStrategy extends BaseStrategy {
  name: TradingStrategy = 'sniper';
  private readonly MIN_SCORE_THRESHOLD = 70;

  async shouldExecute(tokenAddress: string): Promise<boolean> {
    try {
      // Check if we've already sniped this token recently
      const cacheKey = `sniped:${tokenAddress}`;
      const alreadySniped = await this.cache.exists(cacheKey);
      
      if (alreadySniped) {
        logger.debug('Token already sniped recently', { tokenAddress });
        return false;
      }

      // Get AI score for the token
      const score = await this.aiService.scoreToken(tokenAddress, 'UNKNOWN', {});
      
      // Only snipe if overall score is high and risk is acceptable
      const shouldSnipe = score.overallScore >= this.MIN_SCORE_THRESHOLD && 
                          score.riskScore < 50 &&
                          score.confidence > 0.6;
      
      logger.info('Sniper evaluation', {
        tokenAddress,
        score: score.overallScore,
        risk: score.riskScore,
        shouldSnipe
      });

      return shouldSnipe;
    } catch (error) {
      logger.error('Sniper shouldExecute error', { tokenAddress, error });
      return false;
    }
  }

  async execute(tokenAddress: string, amount: number): Promise<Trade | null> {
    try {
      logger.info('Executing sniper strategy', { tokenAddress, amount });

      // Validate amount
      if (!await this.validateTradeAmount(amount)) {
        logger.warn('Insufficient balance for sniper trade', { amount });
        return null;
      }

      // Get best quote
      const SOL_MINT = 'So11111111111111111111111111111111111111112';
      const quote = await this.sorService.getBestQuote(SOL_MINT, tokenAddress, amount);

      if (!quote) {
        logger.warn('No quote available for sniper trade', { tokenAddress });
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

      // Execute the trade (simplified - actual execution would involve transaction creation)
      logger.info('Sniper trade created', { trade });

      // Mark this token as sniped for 1 hour
      await this.cache.set(`sniped:${tokenAddress}`, true, 3600);

      return trade;
    } catch (error) {
      logger.error('Sniper strategy execution error', { tokenAddress, error });
      return null;
    }
  }
}
