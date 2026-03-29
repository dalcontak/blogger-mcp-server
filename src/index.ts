import { config } from './config';
import { BloggerService } from './bloggerService';
import { initMCPServer, createToolDefinitions } from './server';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Server as HttpServer } from 'http';
import { ServerMode, ServerStatus, ClientConnection, ServerStats } from './types';
import { WebUIManager } from './ui-manager';

async function main() {
  try {
    console.log('Starting Blogger MCP server...');

    const hasOAuth2 = !!(config.oauth2.clientId && config.oauth2.clientSecret && config.oauth2.refreshToken);
    const hasApiKey = !!config.blogger.apiKey;

    if (!hasOAuth2 && !hasApiKey) {
      console.error(
        'ERROR: No authentication configured.\n' +
        'Set BLOGGER_API_KEY (read-only) or\n' +
        'GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET + GOOGLE_REFRESH_TOKEN (full access).'
      );
      process.exit(1);
    }

    console.log(`Authentication mode: ${hasOAuth2 ? 'OAuth2 (full access)' : 'API Key (read-only)'}`);

    const bloggerService = new BloggerService();

    const serverMode: ServerMode = config.mode === 'http'
      ? { type: 'http' as const, host: config.http.host, port: config.http.port }
      : { type: 'stdio' as const };

    const serverConfig = {
      mode: serverMode,
      blogger: config.blogger,
      oauth2: config.oauth2,
      logging: config.logging
    };

    const server = initMCPServer(bloggerService, serverConfig);

    const toolDefinitions = createToolDefinitions(bloggerService);
    const toolMap = new Map(toolDefinitions.map(t => [t.name, t]));
    const serverTools = toolDefinitions.map(t => t.name);

    let uiManager: WebUIManager | undefined;
    let uiPort: number | undefined;

    if (config.ui.port > 0 && config.ui.port < 65536) {
      uiManager = new WebUIManager();
      uiPort = config.ui.port;
      await uiManager.start(uiPort);
    }

    let serverStatus: ServerStatus = {
      running: true,
      mode: serverMode.type,
      startTime: new Date(),
      connections: 0,
      tools: serverTools
    };

    const connections: Record<string, ClientConnection> = {};
    const stats = {
      totalRequests: 0,
      successfulRequests: 0,
      totalResponseTime: 0,
      toolUsage: serverTools.reduce<Record<string, number>>((acc, tool) => {
        acc[tool] = 0;
        return acc;
      }, {})
    };

    function updateStats(tool: string, success = true, duration = 0) {
      stats.totalRequests++;
      if (success) {
        stats.successfulRequests++;
        stats.totalResponseTime += duration;
      }

      if (stats.toolUsage[tool] !== undefined) {
        stats.toolUsage[tool]++;
      }

      const updatedStats: ServerStats = {
        totalRequests: stats.totalRequests,
        successfulRequests: stats.successfulRequests,
        failedRequests: stats.totalRequests - stats.successfulRequests,
        averageResponseTime: stats.successfulRequests > 0
          ? Math.round(stats.totalResponseTime / stats.successfulRequests)
          : 0,
        toolUsage: stats.toolUsage
      };

      uiManager?.updateStats(updatedStats);
    }

    function updateConnections(clientId: string, clientIp?: string) {
      const now = new Date();

      if (!connections[clientId]) {
        connections[clientId] = {
          id: clientId,
          ip: clientIp,
          connectedAt: now,
          lastActivity: now,
          requestCount: 1
        };
      } else {
        connections[clientId].lastActivity = now;
        connections[clientId].requestCount++;
      }

      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      Object.keys(connections).forEach(id => {
        if (connections[id].lastActivity < fiveMinutesAgo) {
          delete connections[id];
        }
      });

      uiManager?.updateConnections(Object.values(connections));

      serverStatus = {
        ...serverStatus,
        connections: Object.keys(connections).length
      };

      uiManager?.updateStatus(serverStatus);
    }

    if (uiManager) {
      const initialStats: ServerStats = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        toolUsage: stats.toolUsage
      };
      uiManager.updateStatus(serverStatus);
      uiManager.updateStats(initialStats);
    }

    let httpServer: HttpServer | undefined;

    if (serverMode.type === 'http') {
      const httpMode = serverMode;
      httpServer = new HttpServer((req, res) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          });
          res.end();
          return;
        }

        if (req.method !== 'POST') {
          res.writeHead(405, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        let bodySize = 0;
        const MAX_BODY_SIZE = 1024 * 1024;

        req.on('data', chunk => {
          bodySize += chunk.length;
          if (bodySize > MAX_BODY_SIZE) {
            res.writeHead(413, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Request entity too large' }));
            req.destroy();
            return;
          }
          body += chunk.toString();
        });

        req.on('end', async () => {
          if (req.destroyed) return;

          try {
            const request = JSON.parse(body);
            const { tool, params } = request;

            const clientIp = req.socket.remoteAddress || 'unknown';
            updateConnections(req.socket.remotePort?.toString() || 'client', clientIp);

            try {
              const startTime = Date.now();

              const toolDef = toolMap.get(tool);
              if (!toolDef) {
                throw new Error(`Unknown tool: ${tool}`);
              }

              const validatedParams = toolDef.args.parse(params || {});
              const result = await toolDef.handler(validatedParams);

              const duration = Date.now() - startTime;
              updateStats(tool, true, duration);

              res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              });

              const textContent = result.content[0]?.text;
              if (textContent) {
                try {
                  const parsedContent = JSON.parse(textContent);
                  res.end(JSON.stringify(parsedContent));
                } catch {
                  res.end(JSON.stringify(result));
                }
              } else {
                res.end(JSON.stringify(result));
              }

            } catch (error) {
              updateStats(tool, false);

              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: `Error executing tool: ${error}` }));
            }
          } catch (error) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `Parsing error: ${error}` }));
          }
        });
      });

      httpServer.listen(httpMode.port, httpMode.host, () => {
        console.log(`Blogger MCP server started in HTTP mode`);
        console.log(`Listening on ${httpMode.host}:${httpMode.port}`);
        if (uiPort) {
          console.log(`Web UI available at http://localhost:${uiPort}`);
        }
      });
    } else {
      const transport = new StdioServerTransport();
      await server.connect(transport);
      console.log('Blogger MCP server started in stdio mode');
      if (uiPort) {
        console.log(`Web UI available at http://localhost:${uiPort}`);
      }
    }

    const shutdown = async () => {
      console.log('Shutting down...');
      serverStatus = { ...serverStatus, running: false };
      uiManager?.updateStatus(serverStatus);

      if (httpServer) {
        httpServer.close();
      }

      setTimeout(() => process.exit(0), 1000);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (error) {
    console.error('Error starting Blogger MCP server:', error);
    process.exit(1);
  }
}

main();
