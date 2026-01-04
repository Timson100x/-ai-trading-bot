import { BaseStrategy } from './BaseStrategy';
import { Trade, TradingStrategy } from '../types';
import { logger } from '../utils/logger';

export class ArbitrageStrategy extends BaseStrategy {
  name: TradingStrategy = 'arbitrage';
  private readonly MIN_PROFIT_PERCENTAGE = 0.02; // 2% minimum profit

  async shouldExecute(tokenAddress: string): Promise<boolean> {
    try {
      // Check for arbitrage opportunity across DEXs
      const opportunity = await this.findArbitrageOpportunity(tokenAddress);
      
      if (!opportunity) {
        return false;
      }

      logger.info('Arbitrage opportunity found', {
        tokenAddress,
        profitPercentage: opportunity.profitPercentage
      });

      return opportunity.profitPercentage >= this.MIN_PROFIT_PERCENTAGE;
    } catch (error) {
      logger.error('Arbitrage shouldExecute error', { tokenAddress, error });
      return false;
    }
  }

  async execute(tokenAddress: string, amount: number): Promise<Trade | null> {
    try {
      logger.info('Executing arbitrage strategy', { tokenAddress, amount });

      // Validate amount
      if (!await this.validateTradeAmount(amount)) {
        logger.warn('Insufficient balance for arbitrage trade', { amount });
        return null;
      }

      // Find arbitrage opportunity
      const opportunity = await this.findArbitrageOpportunity(tokenAddress);
      
      if (!opportunity) {
        logger.warn('No arbitrage opportunity found', { tokenAddress });
        return null;
      }

      // Create trade record for the buy side
      const trade: Trade = {
        id: this.generateTradeId(),
        tokenAddress,
        type: 'buy',
        amount,
        price: opportunity.buyPrice,
        strategy: this.name,
        status: 'pending',
        timestamp: Date.now()
      };

      logger.info('Arbitrage trade created', {
        trade,
        buyDex: opportunity.buyDex,
        sellDex: opportunity.sellDex,
        expectedProfit: opportunity.expectedProfit
      });

      return trade;
    } catch (error) {
      logger.error('Arbitrage strategy execution error', { tokenAddress, error });
      return null;
    }
  }

  private async findArbitrageOpportunity(tokenAddress: string): Promise<{
    buyDex: string;
    sellDex: string;
    buyPrice: number;
    sellPrice: number;
    profitPercentage: number;
    expectedProfit: number;
  } | null> {
    try {
      const SOL_MINT = 'So11111111111111111111111111111111111111112';
      const testAmount = 0.1; // Use 0.1 SOL for quote comparison

      // Get quotes from all DEXs
      const quotes = await this.sorService.compareAllQuotes(SOL_MINT, tokenAddress, testAmount);

      if (quotes.length < 2) {
        return null;
      }

      // Find best buy (lowest price per token)
      const buyQuote = quotes[quotes.length - 1]; // Lowest output = highest price = worst for buying
      // Actually, we want highest output for buying (best deal)
      const bestBuyQuote = quotes[0]; // Highest output amount

      // For selling, we'd swap the mints and check
      const sellQuotes = await this.sorService.compareAllQuotes(tokenAddress, SOL_MINT, bestBuyQuote.outAmount);

      if (sellQuotes.length === 0) {
        return null;
      }

      const bestSellQuote = sellQuotes[0]; // Highest SOL output

      // Calculate profit
      const investedSOL = testAmount;
      const returnedSOL = bestSellQuote.outAmount;
      const profit = returnedSOL - investedSOL;
      const profitPercentage = profit / investedSOL;

      // Account for fees
      const totalFees = bestBuyQuote.fee + bestSellQuote.fee;
      const netProfit = profit - totalFees;
      const netProfitPercentage = netProfit / investedSOL;

      if (netProfitPercentage < this.MIN_PROFIT_PERCENTAGE) {
        return null;
      }

      return {
        buyDex: bestBuyQuote.dex,
        sellDex: bestSellQuote.dex,
        buyPrice: investedSOL / bestBuyQuote.outAmount,
        sellPrice: bestSellQuote.outAmount / bestBuyQuote.outAmount,
        profitPercentage: netProfitPercentage,
        expectedProfit: netProfit
      };
    } catch (error) {
      logger.error('Error finding arbitrage opportunity', { tokenAddress, error });
      return null;
    }
  }
}
