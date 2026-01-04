import { Config } from '../config';
import { logger } from '../utils/logger';
import { Trade, RiskProfile } from '../types';
import { CacheService } from './CacheService';
import { AIService } from './AIService';

export class RiskManagementService {
  private cache: CacheService;
  private aiService: AIService;
  private activeTrades: Map<string, Trade> = new Map();
  private tradeHistory: Trade[] = [];
  private currentRiskProfile: RiskProfile;

  constructor(cache: CacheService, aiService: AIService) {
    this.cache = cache;
    this.aiService = aiService;
    this.currentRiskProfile = Config.getRiskProfile();
    logger.info('Risk Management Service initialized', { 
      profile: this.currentRiskProfile.name 
    });
  }

  async validateTrade(trade: Trade): Promise<{ allowed: boolean; reason?: string }> {
    // Check max concurrent trades
    if (this.activeTrades.size >= this.currentRiskProfile.maxConcurrentTrades) {
      return {
        allowed: false,
        reason: `Maximum concurrent trades limit reached (${this.currentRiskProfile.maxConcurrentTrades})`
      };
    }

    // Check trade amount limits
    if (trade.amount > Config.MAX_TRADE_AMOUNT) {
      return {
        allowed: false,
        reason: `Trade amount exceeds maximum limit (${Config.MAX_TRADE_AMOUNT} SOL)`
      };
    }

    if (trade.amount < Config.MIN_TRADE_AMOUNT) {
      return {
        allowed: false,
        reason: `Trade amount below minimum limit (${Config.MIN_TRADE_AMOUNT} SOL)`
      };
    }

    // Check position size limit
    const totalExposure = await this.getTotalExposure();
    if (totalExposure + trade.amount > this.currentRiskProfile.maxPositionSize * 10) {
      return {
        allowed: false,
        reason: `Total position size would exceed risk profile limit`
      };
    }

    // Check cooldown
    const lastTradeTime = await this.getLastTradeTime(trade.tokenAddress);
    if (lastTradeTime && Date.now() - lastTradeTime < Config.TRADE_COOLDOWN_MS) {
      return {
        allowed: false,
        reason: `Trade cooldown period active for this token`
      };
    }

    return { allowed: true };
  }

  async addTrade(trade: Trade): Promise<void> {
    this.activeTrades.set(trade.id, trade);
    await this.cache.set(`last_trade:${trade.tokenAddress}`, Date.now(), 3600);
    logger.info('Trade added to risk monitoring', { tradeId: trade.id });
  }

  async completeTrade(tradeId: string, success: boolean, profit?: number): Promise<void> {
    const trade = this.activeTrades.get(tradeId);
    
    if (trade) {
      trade.status = success ? 'completed' : 'failed';
      this.tradeHistory.push(trade);
      this.activeTrades.delete(tradeId);
      
      logger.info('Trade completed', { 
        tradeId, 
        success, 
        profit,
        activeTrades: this.activeTrades.size 
      });

      // Periodically analyze risk profile
      if (this.tradeHistory.length % 10 === 0) {
        await this.analyzeAndAdjustRiskProfile();
      }
    }
  }

  async checkStopLoss(trade: Trade, currentPrice: number): Promise<boolean> {
    const priceDrop = (trade.price - currentPrice) / trade.price;
    
    if (priceDrop >= this.currentRiskProfile.stopLossPercentage) {
      logger.warn('Stop loss triggered', {
        tradeId: trade.id,
        entryPrice: trade.price,
        currentPrice,
        dropPercentage: (priceDrop * 100).toFixed(2)
      });
      return true;
    }
    
    return false;
  }

  async checkTakeProfit(trade: Trade, currentPrice: number): Promise<boolean> {
    const priceGain = (currentPrice - trade.price) / trade.price;
    
    if (priceGain >= this.currentRiskProfile.takeProfitPercentage) {
      logger.info('Take profit triggered', {
        tradeId: trade.id,
        entryPrice: trade.price,
        currentPrice,
        gainPercentage: (priceGain * 100).toFixed(2)
      });
      return true;
    }
    
    return false;
  }

  private async getTotalExposure(): Promise<number> {
    let total = 0;
    for (const trade of this.activeTrades.values()) {
      if (trade.status === 'pending' || trade.status === 'executing') {
        total += trade.amount;
      }
    }
    return total;
  }

  private async getLastTradeTime(tokenAddress: string): Promise<number | null> {
    return await this.cache.get<number>(`last_trade:${tokenAddress}`);
  }

  private async analyzeAndAdjustRiskProfile(): Promise<void> {
    try {
      logger.info('Analyzing trading history for risk adjustment', {
        historySize: this.tradeHistory.length
      });

      const recentTrades = this.tradeHistory.slice(-50);
      const recommendedProfile = await this.aiService.analyzeRiskProfile(recentTrades);

      if (recommendedProfile !== this.currentRiskProfile.name) {
        logger.info('AI recommends risk profile change', {
          current: this.currentRiskProfile.name,
          recommended: recommendedProfile
        });

        // Note: Actual profile change would require careful consideration
        // For now, just log the recommendation
      }
    } catch (error) {
      logger.error('Error analyzing risk profile', { error });
    }
  }

  getActiveTradesCount(): number {
    return this.activeTrades.size;
  }

  getTradeHistory(): Trade[] {
    return [...this.tradeHistory];
  }

  getCurrentRiskProfile(): RiskProfile {
    return this.currentRiskProfile;
  }

  getActiveTrades(): Trade[] {
    return Array.from(this.activeTrades.values());
  }
}
