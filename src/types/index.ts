export interface TokenScore {
  address: string;
  symbol: string;
  riskScore: number; // 0-100, lower is safer
  rewardScore: number; // 0-100, higher is better
  overallScore: number; // Combined score
  confidence: number; // 0-1, AI confidence level
  reasoning: string;
  timestamp: number;
}

export interface Trade {
  id: string;
  tokenAddress: string;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  strategy: TradingStrategy;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  timestamp: number;
  txSignature?: string;
  error?: string;
}

export type TradingStrategy = 
  | 'sniper' 
  | 'copy_trading' 
  | 'liquidity_provision' 
  | 'scalping' 
  | 'arbitrage';

export interface WalletInfo {
  publicKey: string;
  balance: number;
  lastUsed: number;
}

export interface RiskProfile {
  name: 'conservative' | 'moderate' | 'aggressive';
  maxPositionSize: number;
  maxConcurrentTrades: number;
  stopLossPercentage: number;
  takeProfitPercentage: number;
}

export interface DEXQuote {
  dex: string;
  inAmount: number;
  outAmount: number;
  priceImpact: number;
  fee: number;
  route: string[];
}

export interface WhaleTransaction {
  signature: string;
  walletAddress: string;
  tokenAddress: string;
  amount: number;
  type: 'buy' | 'sell';
  timestamp: number;
}

export interface TelegramAlert {
  type: 'trade' | 'error' | 'summary' | 'whale';
  message: string;
  priority: 'low' | 'medium' | 'high';
  timestamp: number;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}
