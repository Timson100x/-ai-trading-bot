import { Connection, ConnectionConfig } from '@solana/web3.js';
import { Config } from '../config';
import { logger } from '../utils/logger';

export class RPCService {
  private connections: Connection[] = [];
  private currentIndex: number = 0;
  private failureCount: Map<number, number> = new Map();
  private readonly MAX_FAILURES = 3;
  private readonly FAILURE_RESET_TIME = 60000; // 1 minute

  constructor() {
    this.initializeConnections();
  }

  private initializeConnections(): void {
    const config: ConnectionConfig = {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000
    };

    // Primary RPC
    this.connections.push(new Connection(Config.SOLANA_RPC_PRIMARY, config));
    logger.info('Primary RPC initialized', { url: Config.SOLANA_RPC_PRIMARY });

    // Fallback RPCs
    Config.SOLANA_RPC_FALLBACKS.forEach((url, index) => {
      this.connections.push(new Connection(url, config));
      logger.info('Fallback RPC initialized', { index: index + 1, url });
    });

    // Initialize failure counts
    this.connections.forEach((_, index) => {
      this.failureCount.set(index, 0);
    });
  }

  getConnection(): Connection {
    // Find first connection with failures below threshold
    for (let i = 0; i < this.connections.length; i++) {
      const index = (this.currentIndex + i) % this.connections.length;
      const failures = this.failureCount.get(index) || 0;
      
      if (failures < this.MAX_FAILURES) {
        this.currentIndex = index;
        return this.connections[index];
      }
    }

    // If all have too many failures, reset and use primary
    logger.warn('All RPCs have high failure count, resetting');
    this.resetFailureCounts();
    this.currentIndex = 0;
    return this.connections[0];
  }

  async executeWithFallback<T>(
    operation: (connection: Connection) => Promise<T>,
    maxRetries: number = this.connections.length
  ): Promise<T> {
    let lastError: Error | null = null;
    let attempts = 0;

    while (attempts < maxRetries) {
      const connection = this.getConnection();
      const currentIndex = this.currentIndex;

      try {
        const result = await operation(connection);
        
        // Reset failure count on success
        this.failureCount.set(currentIndex, 0);
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        // Increment failure count
        const failures = (this.failureCount.get(currentIndex) || 0) + 1;
        this.failureCount.set(currentIndex, failures);
        
        logger.warn('RPC operation failed, trying fallback', {
          index: currentIndex,
          failures,
          error: lastError.message,
          attempt: attempts + 1
        });

        // Move to next connection
        this.currentIndex = (this.currentIndex + 1) % this.connections.length;
        attempts++;

        // Small delay before retry
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    logger.error('All RPC operations failed', { error: lastError });
    throw new Error(`RPC operation failed after ${maxRetries} attempts: ${lastError?.message}`);
  }

  private resetFailureCounts(): void {
    this.failureCount.forEach((_, index) => {
      this.failureCount.set(index, 0);
    });
    logger.info('RPC failure counts reset');
  }

  // Start periodic failure count reset
  startPeriodicReset(): void {
    setInterval(() => {
      this.resetFailureCounts();
    }, this.FAILURE_RESET_TIME);
  }

  getConnectionStatus(): Array<{ index: number; failures: number; url: string }> {
    return this.connections.map((conn, index) => ({
      index,
      failures: this.failureCount.get(index) || 0,
      url: conn.rpcEndpoint
    }));
  }

  getCurrentConnectionIndex(): number {
    return this.currentIndex;
  }
}
