import express from 'express';
import path from 'path';
import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { ServerStatus, ClientConnection, ServerStats } from './types';

// UI manager interface
export interface UIManager {
  start(port: number): Promise<void>;
  stop(): Promise<void>;
  updateStatus(status: ServerStatus): void;
  updateConnections(connections: ClientConnection[]): void;
  updateStats(stats: ServerStats): void;
}

// UI manager implementation
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
    
    // Express configuration
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, '../public')));
    
    // API routes
    this.app.get('/api/status', (req, res) => {
      res.json(this.status);
    });
    
    this.app.get('/api/connections', (req, res) => {
      res.json(this.connections);
    });
    
    this.app.get('/api/stats', (req, res) => {
      res.json(this.stats);
    });
    
    // Main route for the UI - wildcard route fix
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/index.html'));
    });
  }

  async start(port: number): Promise<void> {
    return new Promise((resolve) => {
      this.server = new HttpServer(this.app);
      this.io = new SocketIOServer(this.server);
      
      // Socket.IO configuration
      this.io.on('connection', (socket) => {
        console.log('New UI connection:', socket.id);
        
        // Send initial data
        socket.emit('status', this.status);
        socket.emit('connections', this.connections);
        socket.emit('stats', this.stats);
        
        // Handle user actions
        socket.on('restart-server', () => {
          console.log('Server restart request received');
          // Restart logic to be implemented
        });
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
