import Redis from 'ioredis';
import { Config } from '../config';
import { logger } from '../utils/logger';
import { CacheEntry } from '../types';

export class CacheService {
  private redis: Redis;
  private isConnected: boolean = false;

  constructor() {
    this.redis = new Redis({
      host: Config.REDIS_HOST,
      port: Config.REDIS_PORT,
      password: Config.REDIS_PASSWORD || undefined,
      db: Config.REDIS_DB,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError: (err) => {
        logger.warn('Redis reconnecting on error', { error: err.message });
        return true;
      }
    });

    this.redis.on('connect', () => {
      this.isConnected = true;
      logger.info('Redis connected successfully');
    });

    this.redis.on('error', (err) => {
      this.isConnected = false;
      logger.error('Redis connection error', { error: err.message });
    });

    this.redis.on('close', () => {
      this.isConnected = false;
      logger.warn('Redis connection closed');
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key);
      if (!data) return null;

      const entry: CacheEntry<T> = JSON.parse(data);
      
      // Check if entry has expired
      if (Date.now() - entry.timestamp > entry.ttl * 1000) {
        await this.delete(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      logger.error('Cache get error', { key, error });
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number = Config.CACHE_TTL_SECONDS): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        data: value,
        timestamp: Date.now(),
        ttl: ttlSeconds
      };
      await this.redis.set(key, JSON.stringify(entry), 'EX', ttlSeconds);
    } catch (error) {
      logger.error('Cache set error', { key, error });
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      logger.error('Cache delete error', { key, error });
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      logger.error('Cache delete pattern error', { pattern, error });
    }
  }

  async increment(key: string, amount: number = 1): Promise<number> {
    try {
      return await this.redis.incrby(key, amount);
    } catch (error) {
      logger.error('Cache increment error', { key, error });
      return 0;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error', { key, error });
      return false;
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}
