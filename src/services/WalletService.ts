import { Keypair, Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import bs58 from 'bs58';
import { Config } from '../config';
import { logger } from '../utils/logger';
import { WalletInfo } from '../types';

export class WalletService {
  private wallets: Keypair[] = [];
  private currentWalletIndex: number = 0;
  private lastRotation: number = Date.now();
  private connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
    this.initializeWallets();
    this.startRotationTimer();
  }

  private initializeWallets(): void {
    try {
      Config.WALLET_PRIVATE_KEYS.forEach((key, index) => {
        try {
          const keypair = Keypair.fromSecretKey(bs58.decode(key));
          this.wallets.push(keypair);
          logger.info('Wallet loaded', { 
            index, 
            publicKey: keypair.publicKey.toBase58() 
          });
        } catch (error) {
          logger.error('Failed to load wallet', { index, error });
        }
      });

      if (this.wallets.length === 0) {
        throw new Error('No valid wallets loaded');
      }

      logger.info(`Wallet service initialized with ${this.wallets.length} wallets`);
    } catch (error) {
      logger.error('Failed to initialize wallets', { error });
      throw error;
    }
  }

  private startRotationTimer(): void {
    setInterval(() => {
      if (Date.now() - this.lastRotation >= Config.WALLET_ROTATION_INTERVAL) {
        this.rotateWallet();
      }
    }, 60000); // Check every minute
  }

  rotateWallet(): void {
    if (this.wallets.length <= 1) return;

    this.currentWalletIndex = (this.currentWalletIndex + 1) % this.wallets.length;
    this.lastRotation = Date.now();
    
    logger.info('Wallet rotated', { 
      newIndex: this.currentWalletIndex,
      publicKey: this.getCurrentWallet().publicKey.toBase58()
    });
  }

  getCurrentWallet(): Keypair {
    return this.wallets[this.currentWalletIndex];
  }

  getWalletByIndex(index: number): Keypair | null {
    if (index < 0 || index >= this.wallets.length) {
      return null;
    }
    return this.wallets[index];
  }

  async getWalletInfo(wallet?: Keypair): Promise<WalletInfo> {
    const keypair = wallet || this.getCurrentWallet();
    
    try {
      const balance = await this.connection.getBalance(keypair.publicKey);
      
      return {
        publicKey: keypair.publicKey.toBase58(),
        balance: balance / LAMPORTS_PER_SOL,
        lastUsed: Date.now()
      };
    } catch (error) {
      logger.error('Failed to get wallet info', { 
        publicKey: keypair.publicKey.toBase58(), 
        error 
      });
      
      return {
        publicKey: keypair.publicKey.toBase58(),
        balance: 0,
        lastUsed: Date.now()
      };
    }
  }

  async getAllWalletInfo(): Promise<WalletInfo[]> {
    const infos: WalletInfo[] = [];
    
    for (const wallet of this.wallets) {
      const info = await this.getWalletInfo(wallet);
      infos.push(info);
    }
    
    return infos;
  }

  async getTotalBalance(): Promise<number> {
    const infos = await this.getAllWalletInfo();
    return infos.reduce((sum, info) => sum + info.balance, 0);
  }

  getWalletCount(): number {
    return this.wallets.length;
  }

  getCurrentWalletIndex(): number {
    return this.currentWalletIndex;
  }

  async checkSufficientBalance(requiredAmount: number): Promise<boolean> {
    const currentWalletInfo = await this.getWalletInfo();
    return currentWalletInfo.balance >= requiredAmount;
  }

  async findWalletWithBalance(requiredAmount: number): Promise<Keypair | null> {
    for (const wallet of this.wallets) {
      const info = await this.getWalletInfo(wallet);
      if (info.balance >= requiredAmount) {
        return wallet;
      }
    }
    return null;
  }
}
