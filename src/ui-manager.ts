import express from 'express';
import path from 'path';
import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { ServerStatus, ClientConnection, ServerStats } from './types';

export interface UIManager {
  start(port: number): Promise<void>;
  stop(): Promise<void>;
  updateStatus(status: ServerStatus): void;
  updateConnections(connections: ClientConnection[]): void;
  updateStats(stats: ServerStats): void;
}

export class WebUIManager implements UIManager {
  private app: express.Application;
  private server: HttpServer | null = null;
  private io: SocketIOServer | null = null;
  private status: ServerStatus = {
    running: false,
    mode: 'stopped',
    connections: 0,
    tools: []
  };
  private connections: ClientConnection[] = [];
  private stats: ServerStats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    toolUsage: {}
  };

  constructor() {
    this.app = express();

    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, '../public')));

    this.app.get('/api/status', (_req, res) => {
      res.json(this.status);
    });

    this.app.get('/api/connections', (_req, res) => {
      res.json(this.connections);
    });

    this.app.get('/api/stats', (_req, res) => {
      res.json(this.stats);
    });

    this.app.get('/', (_req, res) => {
      res.sendFile(path.join(__dirname, '../public/index.html'));
    });
  }

  async start(port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = new HttpServer(this.app);
      this.io = new SocketIOServer(this.server);

      this.server.on('error', (err) => {
        reject(err);
      });

      this.io.on('connection', (socket) => {
        console.log('New UI connection:', socket.id);

        socket.emit('status', this.status);
        socket.emit('connections', this.connections);
        socket.emit('stats', this.stats);
      });

      this.server.listen(port, () => {
        console.log(`Web UI started on port ${port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close((err) => {
          if (err) {
            reject(err);
          } else {
            this.server = null;
            this.io = null;
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  updateStatus(status: ServerStatus): void {
    this.status = status;
    if (this.io) {
      this.io.emit('status', status);
    }
  }

  updateConnections(connections: ClientConnection[]): void {
    this.connections = connections;
    if (this.io) {
      this.io.emit('connections', connections);
    }
  }

  updateStats(stats: ServerStats): void {
    this.stats = stats;
    if (this.io) {
      this.io.emit('stats', stats);
    }
  }
}
