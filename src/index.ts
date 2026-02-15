import { config } from './config';
import { BloggerService } from './bloggerService';
import { initMCPServer, createToolDefinitions } from './server';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Server as HttpServer } from 'http';
import { ServerMode, ServerStatus, ClientConnection, ServerStats } from './types';
import { WebUIManager } from './ui-manager';

/**
 * Main entry point for the Blogger MCP server
 */
async function main() {
  try {
    console.log('Starting Blogger MCP server...');
    
    // Verify that at least one authentication method is configured
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
    
    if (hasOAuth2) {
      console.log('Authentication mode: OAuth2 (full access)');
    } else {
      console.log('Authentication mode: API Key (read-only)');
    }
    
    // Initialize the Blogger service
    const bloggerService = new BloggerService();
    
    // Convert configuration to the format expected by the server
    const serverMode: ServerMode = config.mode === 'http' 
      ? { type: 'http' as const, host: config.http.host, port: config.http.port } 
      : { type: 'stdio' as const };
    
    const serverConfig = {
      mode: serverMode,
      blogger: config.blogger,
      oauth2: config.oauth2,
      logging: config.logging
    };
    
    // Initialize the MCP server with all tools
    const server = initMCPServer(bloggerService, serverConfig);
    
    // Get tool definitions for direct access in HTTP mode and stats
    const toolDefinitions = createToolDefinitions(bloggerService);
    const toolMap = new Map(toolDefinitions.map(t => [t.name, t]));
    const serverTools = toolDefinitions.map(t => t.name);

    // Initialize the Web UI only if UI_PORT is set
    let uiManager: WebUIManager | undefined;
    let uiPort: number | undefined;

    if (process.env.UI_PORT) {
      const parsedPort = parseInt(process.env.UI_PORT);
      if (!isNaN(parsedPort) && parsedPort > 0 && parsedPort < 65536) {
        uiManager = new WebUIManager();
        uiPort = parsedPort;
        await uiManager.start(uiPort);
      }
    }

    // Initialize server statistics and status
    let serverStatus: ServerStatus = {
      running: true,
      mode: serverMode.type,
      startTime: new Date(),
      connections: 0,
      tools: serverTools
    };

    const serverStats: ServerStats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      toolUsage: serverTools.reduce((acc, tool) => {
        acc[tool] = 0;
        return acc;
      }, {} as Record<string, number>)
    };

    if (uiManager) {
      uiManager.updateStatus(serverStatus);
      uiManager.updateStats(serverStats);
    }
    
    // Configure the appropriate transport based on the mode
    let httpServer: HttpServer | undefined;

    if (serverMode.type === 'http') {
      // For HTTP mode, we use Node.js HTTP server directly
      // since the official MCP SDK does not have an HttpServerTransport equivalent
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
        const MAX_BODY_SIZE = 1024 * 1024; // 1MB limit

        req.on('data', chunk => {
          bodySize += chunk.length;
          if (bodySize > MAX_BODY_SIZE) {
            res.writeHead(413, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Request entity too large' }));
            req.destroy(); // Stop receiving data
            return;
          }
          body += chunk.toString();
        });
        
        req.on('end', async () => {
          if (req.destroyed) return;

          try {
            const request = JSON.parse(body);
            const { tool, params } = request;
            
            // Add client connection
            const clientIp = req.socket.remoteAddress || 'unknown';
            updateConnections(req.socket.remotePort?.toString() || 'client', clientIp);
            
            // Call the appropriate tool
            try {
              const startTime = Date.now();
              
              const toolDef = toolMap.get(tool);

              if (!toolDef) {
                 throw new Error(`Unknown tool: ${tool}`);
              }

              // Validate parameters using Zod schema
              let validatedParams;
              try {
                validatedParams = toolDef.args.parse(params || {});
              } catch (validationError) {
                throw new Error(`Invalid parameters: ${validationError}`);
              }

              // Execute tool handler
              const result = await toolDef.handler(validatedParams);
              
              const duration = Date.now() - startTime;
              
              // Update success statistics
              updateStats(tool, true, duration);
              
              // If the handler returned an isError: true, we might want to return 400 or just return the error object 
              // as per MCP protocol. Here we are in HTTP mode, let's just return 200 with the result object which contains the error message.
              // But strictly speaking, if it's an error, we should probably update stats as failed? 
              // The handler catches exceptions and returns { isError: true, ... }. 
              // So if result.isError is true, we should count it as failed?
              // The previous implementation counted catch block as failed. 
              // Let's stick to the previous logic: if handler throws, it's a failure. If handler returns result (even error result), it's success execution of the tool.
              
              res.writeHead(200, { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              });
              
              // MCP Tools return { content: [...] }, but the previous HTTP implementation returned simplified objects like { blogs: [...] }.
              // To maintain backward compatibility with the previous HTTP API (if any clients rely on it), 
              // we might need to transform the MCP result format back to the simplified format?
              // The previous switch statement returned `result = { blogs }`.
              // The tool handlers now return `{ content: [{ type: 'text', text: JSON.stringify({ blogs }) }] }`.
              // We should probably parse the JSON text back if we want to return JSON.
              // OR, we just return the MCP result directly. 
              // Given that this is an MCP server, clients should expect MCP format.
              // HOWEVER, the `index.ts` HTTP implementation seemed to be a custom JSON API wrapper around the tools.
              // Let's try to parse the response text if possible to match previous behavior, 
              // OR better: accept that the response format changes to MCP standard or keep it simple.
              // The previous implementation was: `res.end(JSON.stringify(result))` where result was `{ blogs: ... }`.
              // The tool handlers return `{ content: [{ text: "{\"blogs\":...}" }] }`.
              
              // Let's unwrap it for HTTP mode to keep it friendly, or just return the text.
              // If we want to return pure JSON like before:
              try {
                const textContent = result.content[0].text;
                // If the text is JSON, parse it and return that.
                const parsedContent = JSON.parse(textContent);
                res.end(JSON.stringify(parsedContent));
              } catch (e) {
                // If not JSON, return as is wrapped
                 res.end(JSON.stringify(result));
              }

            } catch (error) {
              // Update failure statistics
              updateStats(tool, false);
              
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ 
                error: `Error executing tool: ${error}` 
              }));
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
      // For stdio mode, we use the official MCP SDK transport
      const transport = new StdioServerTransport();
      await server.connect(transport);
      console.log(`Blogger MCP server started in stdio mode`);
      if (uiPort) {
        console.log(`Web UI available at http://localhost:${uiPort}`);
      }
    }
    
    // Functions to update statistics and connections
    const connections: Record<string, ClientConnection> = {};
    let stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalResponseTime: 0,
      toolUsage: serverTools.reduce((acc, tool) => {
        acc[tool] = 0;
        return acc;
      }, {} as Record<string, number>)
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

      if (uiManager) {
        uiManager.updateStats(updatedStats);
      }
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
      
      // Clean up inactive connections (older than 5 minutes)
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      Object.keys(connections).forEach(id => {
        if (connections[id].lastActivity < fiveMinutesAgo) {
          delete connections[id];
        }
      });

      if (uiManager) {
        uiManager.updateConnections(Object.values(connections));
      }

      // Update status with connection count
      // FIX: Update the variable and then send it
      serverStatus = {
        ...serverStatus,
        connections: Object.keys(connections).length
      };

      if (uiManager) {
        uiManager.updateStatus(serverStatus);
      }
    }

    // Graceful shutdown
    const shutdown = async () => {
      console.log('Shutting down...');
      serverStatus = { ...serverStatus, running: false };
      if (uiManager) {
        uiManager.updateStatus(serverStatus);
      }

      if (httpServer) {
        httpServer.close();
      }

      // Allow time for cleanup if needed
      setTimeout(() => process.exit(0), 1000);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (error) {
    console.error('Error starting Blogger MCP server:', error);
    process.exit(1);
  }
}

// Run main function
main();
