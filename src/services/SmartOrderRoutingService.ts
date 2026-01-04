import axios from 'axios';
import { Config } from '../config';
import { logger } from '../utils/logger';
import { DEXQuote } from '../types';
import { CacheService } from './CacheService';

export class SmartOrderRoutingService {
  private cache: CacheService;

  constructor(cache: CacheService) {
    this.cache = cache;
    logger.info('Smart Order Routing Service initialized');
  }

  async getBestQuote(
    inputMint: string,
    outputMint: string,
    amount: number,
    slippageBps: number = 100
  ): Promise<DEXQuote | null> {
    const cacheKey = `quote:${inputMint}:${outputMint}:${amount}`;
    const cached = await this.cache.get<DEXQuote>(cacheKey);
    
    if (cached) {
      logger.debug('Using cached quote', { inputMint, outputMint, amount });
      return cached;
    }

    const quotes = await Promise.allSettled([
      this.getJupiterQuote(inputMint, outputMint, amount, slippageBps),
      this.getOrcaQuote(inputMint, outputMint, amount),
      this.getRaydiumQuote(inputMint, outputMint, amount)
    ]);

    const validQuotes: DEXQuote[] = quotes
      .filter((result): result is PromiseFulfilledResult<DEXQuote | null> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value as DEXQuote);

    if (validQuotes.length === 0) {
      logger.warn('No valid quotes found', { inputMint, outputMint, amount });
      return null;
    }

    // Select best quote (highest output amount)
    const bestQuote = validQuotes.reduce((best, current) => 
      current.outAmount > best.outAmount ? current : best
    );

    logger.info('Best quote found', {
      dex: bestQuote.dex,
      inAmount: bestQuote.inAmount,
      outAmount: bestQuote.outAmount,
      priceImpact: bestQuote.priceImpact
    });

    // Cache for 30 seconds
    await this.cache.set(cacheKey, bestQuote, 30);

    return bestQuote;
  }

  private async getJupiterQuote(
    inputMint: string,
    outputMint: string,
    amount: number,
    slippageBps: number
  ): Promise<DEXQuote | null> {
    try {
      const response = await axios.get(`${Config.JUPITER_API_URL}/quote`, {
        params: {
          inputMint,
          outputMint,
          amount: Math.floor(amount * 1e9), // Convert to lamports
          slippageBps
        },
        timeout: 5000
      });

      if (!response.data || !response.data.outAmount) {
        return null;
      }

      const data = response.data;
      return {
        dex: 'Jupiter',
        inAmount: amount,
        outAmount: parseInt(data.outAmount) / 1e9,
        priceImpact: parseFloat(data.priceImpactPct || '0'),
        fee: parseFloat(data.platformFee || '0') / 1e9,
        route: data.routePlan?.map((r: any) => r.swapInfo?.label || 'unknown') || []
      };
    } catch (error) {
      logger.debug('Jupiter quote failed', { error });
      return null;
    }
  }

  private async getOrcaQuote(
    inputMint: string,
    outputMint: string,
    amount: number
  ): Promise<DEXQuote | null> {
    try {
      // Note: Orca API implementation would go here
      // This is a placeholder as Orca's API structure may vary
      const response = await axios.get(`${Config.ORCA_API_URL}/quote`, {
        params: {
          inputToken: inputMint,
          outputToken: outputMint,
          amount: amount,
        },
        timeout: 5000
      });

      if (!response.data || !response.data.expectedOutputAmount) {
        return null;
      }

      return {
        dex: 'Orca',
        inAmount: amount,
        outAmount: parseFloat(response.data.expectedOutputAmount),
        priceImpact: parseFloat(response.data.priceImpact || '0'),
        fee: parseFloat(response.data.fee || '0'),
        route: ['Orca']
      };
    } catch (error) {
      logger.debug('Orca quote failed', { error });
      return null;
    }
  }

  private async getRaydiumQuote(
    inputMint: string,
    outputMint: string,
    amount: number
  ): Promise<DEXQuote | null> {
    try {
      // Note: Raydium API implementation would go here
      // This is a placeholder as Raydium's API structure may vary
      const response = await axios.get(`${Config.RAYDIUM_API_URL}/quote`, {
        params: {
          inputMint,
          outputMint,
          amount
        },
        timeout: 5000
      });

      if (!response.data || !response.data.outputAmount) {
        return null;
      }

      return {
        dex: 'Raydium',
        inAmount: amount,
        outAmount: parseFloat(response.data.outputAmount),
        priceImpact: parseFloat(response.data.priceImpact || '0'),
        fee: parseFloat(response.data.fee || '0'),
        route: ['Raydium']
      };
    } catch (error) {
      logger.debug('Raydium quote failed', { error });
      return null;
    }
  }

  async compareAllQuotes(
    inputMint: string,
    outputMint: string,
    amount: number
  ): Promise<DEXQuote[]> {
    const quotes = await Promise.allSettled([
      this.getJupiterQuote(inputMint, outputMint, amount, 100),
      this.getOrcaQuote(inputMint, outputMint, amount),
      this.getRaydiumQuote(inputMint, outputMint, amount)
    ]);

    return quotes
      .filter((result): result is PromiseFulfilledResult<DEXQuote | null> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value as DEXQuote)
      .sort((a, b) => b.outAmount - a.outAmount);
  }
}
