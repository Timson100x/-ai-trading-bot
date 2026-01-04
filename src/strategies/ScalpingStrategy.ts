import { BaseStrategy } from './BaseStrategy';
import { Trade, TradingStrategy } from '../types';
import { logger } from '../utils/logger';
import { Config } from '../config';

export class ScalpingStrategy extends BaseStrategy {
  name: TradingStrategy = 'scalping';
  private readonly TARGET_PROFIT_PERCENTAGE = 0.005; // 0.5% profit target
  private readonly MAX_HOLD_TIME = 300000; // 5 minutes max hold time
  private readonly MIN_VOLUME_THRESHOLD = 100; // Minimum volume in SOL

  async shouldExecute(tokenAddress: string): Promise<boolean> {
    try {
      // Check if we're already scalping this token
      const activePosition = await this.cache.get(`scalp_position:${tokenAddress}`);
      if (activePosition) {
        logger.debug('Already have active scalp position', { tokenAddress });
        return false;
      }

      // Check recent price volatility and volume
      const marketData = await this.getMarketData(tokenAddress);
      
      if (!marketData) {
        return false;
      }

      // Scalping requires high volume and volatility
      const shouldScalp = marketData.volume24h >= this.MIN_VOLUME_THRESHOLD &&
                          marketData.volatility > 0.02 && // At least 2% volatility
                          marketData.spread < 0.01; // Tight spread for quick execution

      logger.info('Scalping evaluation', {
        tokenAddress,
        volume: marketData.volume24h,
        volatility: marketData.volatility,
        shouldScalp
      });

      return shouldScalp;
    } catch (error) {
      logger.error('Scalping shouldExecute error', { tokenAddress, error });
      return false;
    }
  }

  async execute(tokenAddress: string, amount: number): Promise<Trade | null> {
    try {
      logger.info('Executing scalping strategy', { tokenAddress, amount });

      // Use smaller amounts for scalping
      const scalpAmount = Math.min(amount, Config.MAX_TRADE_AMOUNT * 0.2);

      // Validate amount
      if (!await this.validateTradeAmount(scalpAmount)) {
        logger.warn('Insufficient balance for scalping trade', { scalpAmount });
        return null;
      }

      // Get best quote with tight slippage
      const SOL_MINT = 'So11111111111111111111111111111111111111112';
      const quote = await this.sorService.getBestQuote(SOL_MINT, tokenAddress, scalpAmount, 50); // 0.5% slippage

      if (!quote) {
        logger.warn('No quote available for scalping trade', { tokenAddress });
        return null;
      }

      // Check if price impact is acceptable for scalping
      if (quote.priceImpact > 0.003) { // Max 0.3% price impact
        logger.warn('Price impact too high for scalping', {
          tokenAddress,
          priceImpact: quote.priceImpact
        });
        return null;
      }

      // Create trade record
      const trade: Trade = {
        id: this.generateTradeId(),
        tokenAddress,
        type: 'buy',
        amount: scalpAmount,
        price: quote.outAmount / quote.inAmount,
        strategy: this.name,
        status: 'pending',
        timestamp: Date.now()
      };

      // Store position for tracking
      await this.cache.set(
        `scalp_position:${tokenAddress}`,
        {
          entryPrice: trade.price,
          amount: scalpAmount,
          timestamp: trade.timestamp,
          tradeId: trade.id
        },
        this.MAX_HOLD_TIME / 1000
      );

      logger.info('Scalping trade created', {
        trade,
        targetProfit: this.TARGET_PROFIT_PERCENTAGE * 100 + '%'
      });

      // Schedule exit check
      setTimeout(() => this.checkExit(tokenAddress, trade), 30000); // Check every 30 seconds

      return trade;
    } catch (error) {
      logger.error('Scalping strategy execution error', { tokenAddress, error });
      return null;
    }
  }

  private async checkExit(tokenAddress: string, entryTrade: Trade): Promise<void> {
    try {
      const position = await this.cache.get<any>(`scalp_position:${tokenAddress}`);
      
      if (!position) {
        return; // Position already closed
      }

      // Check if max hold time exceeded
      if (Date.now() - position.timestamp > this.MAX_HOLD_TIME) {
        logger.info('Max hold time exceeded for scalp position', { tokenAddress });
        await this.exitPosition(tokenAddress, position, 'timeout');
        return;
      }

      // Get current price
      const SOL_MINT = 'So11111111111111111111111111111111111111112';
      const quote = await this.sorService.getBestQuote(tokenAddress, SOL_MINT, position.amount);

      if (!quote) {
        // Reschedule check
        setTimeout(() => this.checkExit(tokenAddress, entryTrade), 30000);
        return;
      }

      const currentPrice = quote.outAmount / quote.inAmount;
      const profitPercentage = (currentPrice - position.entryPrice) / position.entryPrice;

      // Check profit target or stop loss
      if (profitPercentage >= this.TARGET_PROFIT_PERCENTAGE) {
        logger.info('Scalp profit target reached', {
          tokenAddress,
          profitPercentage: (profitPercentage * 100).toFixed(2) + '%'
        });
        await this.exitPosition(tokenAddress, position, 'profit');
      } else if (profitPercentage < -0.003) { // -0.3% stop loss
        logger.warn('Scalp stop loss triggered', {
          tokenAddress,
          lossPercentage: (profitPercentage * 100).toFixed(2) + '%'
        });
        await this.exitPosition(tokenAddress, position, 'stop_loss');
      } else {
        // Continue monitoring
        setTimeout(() => this.checkExit(tokenAddress, entryTrade), 30000);
      }
    } catch (error) {
      logger.error('Error checking scalp exit', { tokenAddress, error });
    }
  }

  private async exitPosition(tokenAddress: string, position: any, reason: string): Promise<void> {
    logger.info('Exiting scalp position', { tokenAddress, reason });
    
    // Execute sell order (implementation would go here)
    
    // Clear position from cache
    await this.cache.delete(`scalp_position:${tokenAddress}`);
  }

  private async getMarketData(tokenAddress: string): Promise<{
    volume24h: number;
    volatility: number;
    spread: number;
  } | null> {
    try {
      // This is a simplified version - real implementation would fetch actual market data
      // from DEX APIs or on-chain data
      
      // Mock data for now
      return {
        volume24h: 100 + Math.random() * 1000,
        volatility: Math.random() * 0.05,
        spread: Math.random() * 0.02
      };
    } catch (error) {
      logger.error('Error fetching market data', { tokenAddress, error });
      return null;
    }
  }
}
