import { Client, ConnectConfig, SFTPWrapper } from 'ssh2';
import path from 'path';
import { Readable, Writable } from 'stream';

const sftpConfig: ConnectConfig = {
  host: process.env.SFTP_HOST || 'sftp',
  port: parseInt(process.env.SFTP_PORT || '22', 10),
  username: process.env.SFTP_USER || 'testuser',
  password: process.env.SFTP_PASSWORD || 'testpass',
};

// Singleton pool manager for SFTP
class SftpClientManager {
  private client: Client | null = null;
  private sftp: SFTPWrapper | null = null;
  private connectionPromise: Promise<SFTPWrapper> | null = null;
  private lastActive: number = Date.now();
  private idleTimeoutMs = 60000; // 1 minute idle timeout
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    this.startIdleCheck();
  }

  private startIdleCheck() {
    this.intervalId = setInterval(() => {
      if (this.client && (Date.now() - this.lastActive > this.idleTimeoutMs)) {
        console.log('Closing idle SFTP connection');
        this.disconnect();
      }
    }, 10000);
  }

  public async getSftp(): Promise<SFTPWrapper> {
    this.lastActive = Date.now();
    
    if (this.sftp) {
      return this.sftp;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      console.log('Connecting to SFTP server...');
      const conn = new Client();
      
      conn.on('ready', () => {
        conn.sftp((err, sftp) => {
          if (err) {
            conn.end();
            this.connectionPromise = null;
            return reject(err);
          }
          this.client = conn;
          this.sftp = sftp;
          this.connectionPromise = null;
          console.log('SFTP connection established');
          resolve(sftp);
        });
      }).on('error', (err) => {
        console.error('SFTP connection error:', err);
        this.connectionPromise = null;
        this.disconnect();
        reject(err);
      }).on('end', () => {
        console.log('SFTP connection ended');
        this.disconnect();
      }).on('close', () => {
        this.disconnect();
      });

      conn.connect(sftpConfig);
    });

    return this.connectionPromise;
  }

  public disconnect() {
    if (this.client) {
      this.client.end();
    }
    this.client = null;
    this.sftp = null;
    this.connectionPromise = null;
  }
}

export const sftpManager = new SftpClientManager();

export function securePath(basePath: string, targetPath: string): string | null {
  // Simple validation to prevent path traversal
  const normalizedBase = path.normalize(basePath);
  const normalizedTarget = path.normalize(targetPath);
  // Optional: enforce that targetPath must be within a certain allowed base directory
  // For now, just ensure it doesn't contain bad characters or path traversal elements.
  if (normalizedTarget.includes('..')) {
    return null;
  }
  return normalizedTarget;
}
