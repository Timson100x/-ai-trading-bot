import { Telegraf } from 'telegraf';
import { Config } from '../config';
import { logger } from '../utils/logger';
import { TelegramAlert, Trade } from '../types';

export class TelegramService {
  private bot: Telegraf | null = null;
  private chatId: string;
  private enabled: boolean = false;

  constructor() {
    this.chatId = Config.TELEGRAM_CHAT_ID;
    
    if (Config.TELEGRAM_BOT_TOKEN && this.chatId) {
      this.bot = new Telegraf(Config.TELEGRAM_BOT_TOKEN);
      this.enabled = true;
      logger.info('Telegram service initialized');
    } else {
      logger.warn('Telegram service disabled - missing bot token or chat ID');
    }
  }

  async sendAlert(alert: TelegramAlert): Promise<void> {
    if (!this.enabled || !this.bot) return;

    try {
      const emoji = this.getEmojiForType(alert.type, alert.priority);
      const message = `${emoji} *${alert.type.toUpperCase()}*\n\n${alert.message}\n\n_${new Date(alert.timestamp).toLocaleString()}_`;
      
      await this.bot.telegram.sendMessage(this.chatId, message, {
        parse_mode: 'Markdown'
      });
    } catch (error) {
      logger.error('Failed to send Telegram alert', { alert, error });
    }
  }

  async sendTradeNotification(trade: Trade, message: string): Promise<void> {
    const alert: TelegramAlert = {
      type: 'trade',
      message: `*Trade ${trade.status.toUpperCase()}*\n` +
               `Token: ${trade.tokenAddress.substring(0, 8)}...\n` +
               `Type: ${trade.type}\n` +
               `Amount: ${trade.amount} SOL\n` +
               `Price: $${trade.price.toFixed(6)}\n` +
               `Strategy: ${trade.strategy}\n` +
               `${message}`,
      priority: trade.status === 'failed' ? 'high' : 'medium',
      timestamp: Date.now()
    };
    await this.sendAlert(alert);
  }

  async sendErrorNotification(error: Error, context?: string): Promise<void> {
    const alert: TelegramAlert = {
      type: 'error',
      message: `*Error Occurred*\n` +
               `${context ? `Context: ${context}\n` : ''}` +
               `Message: ${error.message}\n` +
               `Stack: ${error.stack?.substring(0, 200)}...`,
      priority: 'high',
      timestamp: Date.now()
    };
    await this.sendAlert(alert);
  }

  async sendDailySummary(
    totalTrades: number,
    successfulTrades: number,
    failedTrades: number,
    totalProfit: number,
    topTokens: string[]
  ): Promise<void> {
    const successRate = totalTrades > 0 ? (successfulTrades / totalTrades * 100).toFixed(2) : '0';
    const alert: TelegramAlert = {
      type: 'summary',
      message: `*Daily Trading Summary*\n\n` +
               `📊 Total Trades: ${totalTrades}\n` +
               `✅ Successful: ${successfulTrades}\n` +
               `❌ Failed: ${failedTrades}\n` +
               `📈 Success Rate: ${successRate}%\n` +
               `💰 Profit/Loss: ${totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(4)} SOL\n\n` +
               `🔥 Top Tokens:\n${topTokens.slice(0, 5).map((t, i) => `${i + 1}. ${t}`).join('\n')}`,
      priority: 'low',
      timestamp: Date.now()
    };
    await this.sendAlert(alert);
  }

  async sendWhaleAlert(walletAddress: string, tokenAddress: string, amount: number, type: 'buy' | 'sell'): Promise<void> {
    const alert: TelegramAlert = {
      type: 'whale',
      message: `*🐋 Whale Activity Detected*\n\n` +
               `Action: ${type.toUpperCase()}\n` +
               `Wallet: ${walletAddress.substring(0, 8)}...${walletAddress.substring(walletAddress.length - 8)}\n` +
               `Token: ${tokenAddress.substring(0, 8)}...\n` +
               `Amount: ${amount.toFixed(2)} SOL`,
      priority: 'high',
      timestamp: Date.now()
    };
    await this.sendAlert(alert);
  }

  private getEmojiForType(type: string, priority: string): string {
    const emojiMap: Record<string, Record<string, string>> = {
      trade: { low: '📝', medium: '💼', high: '⚡' },
      error: { low: '⚠️', medium: '❗', high: '🚨' },
      summary: { low: '📊', medium: '📈', high: '📊' },
      whale: { low: '🐋', medium: '🐋', high: '🐋' }
    };
    return emojiMap[type]?.[priority] || '📌';
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}
