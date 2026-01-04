import { Connection } from '@solana/web3.js';
import { Trade, TradingStrategy } from '../types';
import { WalletService } from '../services/WalletService';
import { AIService } from '../services/AIService';
import { SmartOrderRoutingService } from '../services/SmartOrderRoutingService';
import { CacheService } from '../services/CacheService';

export interface IStrategy {
  name: TradingStrategy;
  execute(tokenAddress: string, amount: number): Promise<Trade | null>;
  shouldExecute(tokenAddress: string): Promise<boolean>;
}

export abstract class BaseStrategy implements IStrategy {
  protected connection: Connection;
  protected walletService: WalletService;
  protected aiService: AIService;
  protected sorService: SmartOrderRoutingService;
  protected cache: CacheService;
  
  abstract name: TradingStrategy;

  constructor(
    connection: Connection,
    walletService: WalletService,
    aiService: AIService,
    sorService: SmartOrderRoutingService,
    cache: CacheService
  ) {
    this.connection = connection;
    this.walletService = walletService;
    this.aiService = aiService;
    this.sorService = sorService;
    this.cache = cache;
  }

  abstract execute(tokenAddress: string, amount: number): Promise<Trade | null>;
  abstract shouldExecute(tokenAddress: string): Promise<boolean>;

  protected generateTradeId(): string {
    return `trade_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  protected async validateTradeAmount(amount: number): Promise<boolean> {
    const walletInfo = await this.walletService.getWalletInfo();
    return walletInfo.balance >= amount && amount > 0;
  }
}
