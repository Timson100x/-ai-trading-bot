import { Connection } from '@solana/web3.js';
import { Config } from './config';
import { logger } from './utils/logger';
import { CacheService } from './services/CacheService';
import { RPCService } from './services/RPCService';
import { WalletService } from './services/WalletService';
import { AIService } from './services/AIService';
import { TelegramService } from './services/TelegramService';
import { SmartOrderRoutingService } from './services/SmartOrderRoutingService';
import { RiskManagementService } from './services/RiskManagementService';
import { MempoolService } from './services/MempoolService';
import { SniperStrategy } from './strategies/SniperStrategy';
import { CopyTradingStrategy } from './strategies/CopyTradingStrategy';
import { ArbitrageStrategy } from './strategies/ArbitrageStrategy';
import { ScalpingStrategy } from './strategies/ScalpingStrategy';
import { LiquidityProvisionStrategy } from './strategies/LiquidityProvisionStrategy';
import { IStrategy } from './strategies/BaseStrategy';
import { Trade } from './types';

export class TradingBot {
  private cache: CacheService;
  private rpcService: RPCService;
  private walletService: WalletService;
  private aiService: AIService;
  private telegramService: TelegramService;
  private sorService: SmartOrderRoutingService;
  private riskService: RiskManagementService;
  private mempoolService: MempoolService;
  private strategies: Map<string, IStrategy> = new Map();
  private isRunning: boolean = false;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor() {
    // Initialize services
    this.cache = new CacheService();
    this.rpcService = new RPCService();
    this.telegramService = new TelegramService();
    
    const connection = this.rpcService.getConnection();
    this.walletService = new WalletService(connection);
    this.aiService = new AIService(this.cache);
    this.sorService = new SmartOrderRoutingService(this.cache);
    this.riskService = new RiskManagementService(this.cache, this.aiService);
    this.mempoolService = new MempoolService(connection, this.cache);

    // Initialize strategies
    this.initializeStrategies(connection);

    logger.info('Trading Bot initialized successfully');
  }

  private initializeStrategies(connection: Connection): void {
    const strategyArgs: ConstructorParameters<typeof SniperStrategy> = [
      connection,
      this.walletService,
      this.aiService,
      this.sorService,
      this.cache
    ];

    const sniper = new SniperStrategy(...strategyArgs);
    const copyTrading = new CopyTradingStrategy(...strategyArgs);
    const arbitrage = new ArbitrageStrategy(...strategyArgs);
    const scalping = new ScalpingStrategy(...strategyArgs);
    const liquidityProvision = new LiquidityProvisionStrategy(...strategyArgs);

    this.strategies.set(sniper.name, sniper);
    this.strategies.set(copyTrading.name, copyTrading);
    this.strategies.set(arbitrage.name, arbitrage);
    this.strategies.set(scalping.name, scalping);
    this.strategies.set(liquidityProvision.name, liquidityProvision);

    logger.info(`Initialized ${this.strategies.size} trading strategies`);
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Trading bot is already running');
      return;
    }

    try {
      // Validate configuration
      Config.validate();

      // Start RPC periodic reset
      this.rpcService.startPeriodicReset();

      // Start mempool monitoring if enabled
      if (Config.MEMPOOL_ANALYSIS_ENABLED) {
        const monitorAddresses = Config.WHALE_WALLET_ADDRESSES;
        if (monitorAddresses.length > 0) {
          await this.mempoolService.startMonitoring(monitorAddresses);
          logger.info('Mempool monitoring started');
        }
      }

      // Send startup notification
      await this.telegramService.sendAlert({
        type: 'summary',
        message: '🤖 Trading Bot Started\n\nAll systems operational',
        priority: 'medium',
        timestamp: Date.now()
      });

      this.isRunning = true;

      // Start health check
      this.startHealthCheck();

      // Start daily summary
      this.scheduleDailySummary();

      logger.info('Trading bot started successfully');
    } catch (error) {
      logger.error('Failed to start trading bot', { error });
      await this.telegramService.sendErrorNotification(error as Error, 'Bot startup');
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping trading bot...');
    this.isRunning = false;

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Stop mempool monitoring
    this.mempoolService.stopMonitoring();

    await this.cache.close();

    await this.telegramService.sendAlert({
      type: 'summary',
      message: '🛑 Trading Bot Stopped',
      priority: 'high',
      timestamp: Date.now()
    });

    logger.info('Trading bot stopped');
  }

  async executeTrade(
    tokenAddress: string,
    strategyName: string,
    amount: number
  ): Promise<Trade | null> {
    if (!this.isRunning) {
      logger.warn('Cannot execute trade - bot is not running');
      return null;
    }

    try {
      const strategy = this.strategies.get(strategyName);
      
      if (!strategy) {
        logger.error('Strategy not found', { strategyName });
        return null;
      }

      // Check if strategy should execute
      const shouldExecute = await strategy.shouldExecute(tokenAddress);
      
      if (!shouldExecute) {
        logger.info('Strategy declined to execute', { tokenAddress, strategyName });
        return null;
      }

      // Execute strategy
      const trade = await strategy.execute(tokenAddress, amount);
      
      if (!trade) {
        return null;
      }

      // Validate with risk management
      const validation = await this.riskService.validateTrade(trade);
      
      if (!validation.allowed) {
        logger.warn('Trade rejected by risk management', {
          tradeId: trade.id,
          reason: validation.reason
        });
        return null;
      }

      // Add to risk monitoring
      await this.riskService.addTrade(trade);

      // Send notification
      await this.telegramService.sendTradeNotification(
        trade,
        'Trade executed successfully'
      );

      return trade;
    } catch (error) {
      logger.error('Trade execution error', { tokenAddress, strategyName, error });
      await this.telegramService.sendErrorNotification(
        error as Error,
        `Trade execution: ${strategyName}`
      );
      return null;
    }
  }

  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        const status = {
          cache: this.cache.getConnectionStatus(),
          rpc: this.rpcService.getConnectionStatus(),
          activeTrades: this.riskService.getActiveTradesCount(),
          wallets: this.walletService.getWalletCount()
        };

        logger.debug('Health check', status);

        // Alert on issues
        if (!status.cache) {
          await this.telegramService.sendAlert({
            type: 'error',
            message: '⚠️ Redis cache connection lost',
            priority: 'high',
            timestamp: Date.now()
          });
        }
      } catch (error) {
        logger.error('Health check failed', { error });
      }
    }, 60000); // Every minute
  }

  private scheduleDailySummary(): void {
    // Calculate time until next midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const timeUntilMidnight = tomorrow.getTime() - now.getTime();

    setTimeout(() => {
      this.sendDailySummary();
      // Then schedule daily
      setInterval(() => this.sendDailySummary(), 24 * 60 * 60 * 1000);
    }, timeUntilMidnight);
  }

  private async sendDailySummary(): Promise<void> {
    try {
      const history = this.riskService.getTradeHistory();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayTrades = history.filter(t => t.timestamp >= today.getTime());
      const successful = todayTrades.filter(t => t.status === 'completed').length;
      const failed = todayTrades.filter(t => t.status === 'failed').length;

      // Calculate profit (simplified)
      const totalProfit = 0; // Would calculate actual P&L

      // Get top tokens
      const tokenCounts = new Map<string, number>();
      todayTrades.forEach(t => {
        tokenCounts.set(t.tokenAddress, (tokenCounts.get(t.tokenAddress) || 0) + 1);
      });

      const topTokens = Array.from(tokenCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([addr]) => `${addr.substring(0, 8)}...`);

      await this.telegramService.sendDailySummary(
        todayTrades.length,
        successful,
        failed,
        totalProfit,
        topTokens
      );
    } catch (error) {
      logger.error('Failed to send daily summary', { error });
    }
  }

  getStatus(): any {
    return {
      running: this.isRunning,
      activeTrades: this.riskService.getActiveTradesCount(),
      strategies: Array.from(this.strategies.keys()),
      riskProfile: this.riskService.getCurrentRiskProfile().name,
      walletCount: this.walletService.getWalletCount(),
      mempoolMonitoring: this.mempoolService.getMonitoringStatus()
    };
  }
}
