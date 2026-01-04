import * as dotenv from 'dotenv';
import { RiskProfile } from '../types';

dotenv.config();

export class Config {
  // Solana RPC
  static readonly SOLANA_RPC_PRIMARY = process.env.SOLANA_RPC_PRIMARY || 'https://api.mainnet-beta.solana.com';
  static readonly SOLANA_RPC_FALLBACKS = [
    process.env.SOLANA_RPC_FALLBACK_1 || 'https://solana-api.projectserum.com',
    process.env.SOLANA_RPC_FALLBACK_2 || 'https://rpc.ankr.com/solana'
  ];

  // Wallet Configuration
  static readonly WALLET_PRIVATE_KEYS = (process.env.WALLET_PRIVATE_KEYS || '').split(',').filter(k => k);
  static readonly WALLET_ROTATION_INTERVAL = parseInt(process.env.WALLET_ROTATION_INTERVAL || '3600000');

  // AI Configuration
  static readonly ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
  static readonly AI_MODEL = process.env.AI_MODEL || 'claude-3-5-sonnet-20241022';
  static readonly AI_MAX_TOKENS = parseInt(process.env.AI_MAX_TOKENS || '1024');

  // Redis Configuration
  static readonly REDIS_HOST = process.env.REDIS_HOST || 'localhost';
  static readonly REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
  static readonly REDIS_PASSWORD = process.env.REDIS_PASSWORD || '';
  static readonly REDIS_DB = parseInt(process.env.REDIS_DB || '0');

  // Telegram Configuration
  static readonly TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
  static readonly TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

  // Trading Configuration
  static readonly MAX_TRADE_AMOUNT = parseFloat(process.env.MAX_TRADE_AMOUNT || '1.0');
  static readonly MIN_TRADE_AMOUNT = parseFloat(process.env.MIN_TRADE_AMOUNT || '0.01');
  static readonly SLIPPAGE_TOLERANCE = parseFloat(process.env.SLIPPAGE_TOLERANCE || '0.01');
  static readonly MAX_CONCURRENT_TRADES = parseInt(process.env.MAX_CONCURRENT_TRADES || '5');
  static readonly TRADE_COOLDOWN_MS = parseInt(process.env.TRADE_COOLDOWN_MS || '1000');

  // Risk Management
  static readonly RISK_PROFILE = process.env.RISK_PROFILE as 'conservative' | 'moderate' | 'aggressive' || 'moderate';
  static readonly MAX_POSITION_SIZE = parseFloat(process.env.MAX_POSITION_SIZE || '0.1');
  static readonly STOP_LOSS_PERCENTAGE = parseFloat(process.env.STOP_LOSS_PERCENTAGE || '0.05');
  static readonly TAKE_PROFIT_PERCENTAGE = parseFloat(process.env.TAKE_PROFIT_PERCENTAGE || '0.15');

  // DEX Configuration
  static readonly JUPITER_API_URL = process.env.JUPITER_API_URL || 'https://quote-api.jup.ag/v6';
  static readonly ORCA_API_URL = process.env.ORCA_API_URL || 'https://api.orca.so';
  static readonly RAYDIUM_API_URL = process.env.RAYDIUM_API_URL || 'https://api.raydium.io';

  // Whale Tracking
  static readonly WHALE_WALLET_ADDRESSES = (process.env.WHALE_WALLET_ADDRESSES || '').split(',').filter(a => a);
  static readonly MIN_WHALE_TRANSACTION_SIZE = parseFloat(process.env.MIN_WHALE_TRANSACTION_SIZE || '100');

  // Logging
  static readonly LOG_LEVEL = process.env.LOG_LEVEL || 'info';
  static readonly LOG_FORMAT = process.env.LOG_FORMAT as 'json' | 'text' || 'json';

  // Performance
  static readonly MEMPOOL_ANALYSIS_ENABLED = process.env.MEMPOOL_ANALYSIS_ENABLED === 'true';
  static readonly FRONTRUNNING_DETECTION_ENABLED = process.env.FRONTRUNNING_DETECTION_ENABLED === 'true';
  static readonly CACHE_TTL_SECONDS = parseInt(process.env.CACHE_TTL_SECONDS || '60');

  static getRiskProfile(): RiskProfile {
    const profiles: Record<string, RiskProfile> = {
      conservative: {
        name: 'conservative',
        maxPositionSize: 0.05,
        maxConcurrentTrades: 3,
        stopLossPercentage: 0.03,
        takeProfitPercentage: 0.10
      },
      moderate: {
        name: 'moderate',
        maxPositionSize: 0.10,
        maxConcurrentTrades: 5,
        stopLossPercentage: 0.05,
        takeProfitPercentage: 0.15
      },
      aggressive: {
        name: 'aggressive',
        maxPositionSize: 0.20,
        maxConcurrentTrades: 10,
        stopLossPercentage: 0.10,
        takeProfitPercentage: 0.30
      }
    };
    return profiles[this.RISK_PROFILE] || profiles.moderate;
  }

  static validate(): void {
    const required = [
      { key: 'ANTHROPIC_API_KEY', value: this.ANTHROPIC_API_KEY },
      { key: 'WALLET_PRIVATE_KEYS', value: this.WALLET_PRIVATE_KEYS.length > 0 }
    ];

    const missing = required.filter(r => !r.value).map(r => r.key);
    if (missing.length > 0) {
      throw new Error(`Missing required configuration: ${missing.join(', ')}`);
    }
  }
}
