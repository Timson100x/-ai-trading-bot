import Anthropic from '@anthropic-ai/sdk';
import { Config } from '../config';
import { logger } from '../utils/logger';
import { TokenScore } from '../types';
import { CacheService } from './CacheService';

export class AIService {
  private client: Anthropic;
  private cache: CacheService;

  constructor(cache: CacheService) {
    this.client = new Anthropic({
      apiKey: Config.ANTHROPIC_API_KEY
    });
    this.cache = cache;
    logger.info('AI Service initialized');
  }

  async scoreToken(
    tokenAddress: string,
    symbol: string,
    marketData: {
      price?: number;
      volume24h?: number;
      liquidity?: number;
      holders?: number;
      age?: number;
    }
  ): Promise<TokenScore> {
    const cacheKey = `token_score:${tokenAddress}`;
    const cached = await this.cache.get<TokenScore>(cacheKey);
    
    if (cached) {
      logger.debug('Using cached token score', { tokenAddress });
      return cached;
    }

    try {
      const prompt = this.buildScoringPrompt(tokenAddress, symbol, marketData);
      
      const message = await this.client.messages.create({
        model: Config.AI_MODEL,
        max_tokens: Config.AI_MAX_TOKENS,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const response = message.content[0].type === 'text' ? message.content[0].text : '';
      const score = this.parseTokenScore(tokenAddress, symbol, response);
      
      // Cache for 5 minutes
      await this.cache.set(cacheKey, score, 300);
      
      logger.info('Token scored successfully', { 
        tokenAddress, 
        riskScore: score.riskScore, 
        rewardScore: score.rewardScore 
      });
      
      return score;
    } catch (error) {
      logger.error('Failed to score token', { tokenAddress, error });
      
      // Return default conservative score on error
      return {
        address: tokenAddress,
        symbol,
        riskScore: 80, // High risk on error
        rewardScore: 20, // Low reward on error
        overallScore: 20,
        confidence: 0.1,
        reasoning: 'Failed to analyze token - using conservative default scores',
        timestamp: Date.now()
      };
    }
  }

  private buildScoringPrompt(
    tokenAddress: string,
    symbol: string,
    marketData: any
  ): string {
    return `You are an expert cryptocurrency trading analyst. Analyze the following Solana token and provide risk/reward scores.

Token: ${symbol}
Address: ${tokenAddress}
Market Data:
- Price: ${marketData.price || 'N/A'}
- 24h Volume: ${marketData.volume24h || 'N/A'}
- Liquidity: ${marketData.liquidity || 'N/A'}
- Holders: ${marketData.holders || 'N/A'}
- Token Age: ${marketData.age || 'N/A'} days

Provide your analysis in the following JSON format:
{
  "riskScore": <0-100, where 0 is lowest risk and 100 is highest risk>,
  "rewardScore": <0-100, where 0 is lowest potential reward and 100 is highest>,
  "overallScore": <0-100, combined risk-adjusted score>,
  "confidence": <0.0-1.0, your confidence in this assessment>,
  "reasoning": "<brief explanation of your scoring>"
}

Consider factors like:
- Liquidity depth (higher is better)
- Volume/liquidity ratio (healthy range is good)
- Number of holders (more distributed is better)
- Token age (too new is risky, established is safer)
- Price stability and volatility

IMPORTANT: Respond ONLY with valid JSON, no additional text.`;
  }

  private parseTokenScore(tokenAddress: string, symbol: string, response: string): TokenScore {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        address: tokenAddress,
        symbol,
        riskScore: Math.max(0, Math.min(100, parsed.riskScore || 50)),
        rewardScore: Math.max(0, Math.min(100, parsed.rewardScore || 50)),
        overallScore: Math.max(0, Math.min(100, parsed.overallScore || 50)),
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
        reasoning: parsed.reasoning || 'No reasoning provided',
        timestamp: Date.now()
      };
    } catch (error) {
      logger.error('Failed to parse AI response', { response, error });
      
      // Return neutral score on parse error
      return {
        address: tokenAddress,
        symbol,
        riskScore: 50,
        rewardScore: 50,
        overallScore: 50,
        confidence: 0.3,
        reasoning: 'Failed to parse AI analysis',
        timestamp: Date.now()
      };
    }
  }

  async analyzeRiskProfile(tradingHistory: any[]): Promise<string> {
    if (tradingHistory.length === 0) {
      return Config.RISK_PROFILE;
    }

    try {
      const prompt = `Analyze the following trading history and recommend a risk profile (conservative, moderate, or aggressive):

Trading History (last ${tradingHistory.length} trades):
${JSON.stringify(tradingHistory.slice(0, 20), null, 2)}

Based on the win rate, average profit/loss, and trading patterns, recommend one of:
- conservative: For cautious trading with lower risk
- moderate: For balanced risk/reward
- aggressive: For higher risk tolerance

Respond with ONLY one word: conservative, moderate, or aggressive`;

      const message = await this.client.messages.create({
        model: Config.AI_MODEL,
        max_tokens: 50,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const response = message.content[0].type === 'text' ? message.content[0].text.trim().toLowerCase() : '';
      
      if (['conservative', 'moderate', 'aggressive'].includes(response)) {
        logger.info('AI recommended risk profile', { profile: response });
        return response;
      }
      
      return Config.RISK_PROFILE;
    } catch (error) {
      logger.error('Failed to analyze risk profile', { error });
      return Config.RISK_PROFILE;
    }
  }
}
