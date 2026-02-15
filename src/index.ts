import { config } from './config';
import { BloggerService } from './bloggerService';
import { initMCPServer } from './server';
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
    
    // Initialize the UI manager
    const uiManager = new WebUIManager();
    
    // Start the UI on port 3001 (or another configured port)
    const uiPort = process.env.UI_PORT ? parseInt(process.env.UI_PORT) : 3001;
    await uiManager.start(uiPort);
    
    // Initialize server statistics and status
    const serverTools = [
      'list_blogs', 'get_blog', 'create_blog', 'list_posts', 
      'search_posts', 'get_post', 'create_post', 'update_post', 
      'delete_post', 'list_labels', 'get_label'
    ];
    
    const serverStatus: ServerStatus = {
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
    
    uiManager.updateStatus(serverStatus);
    uiManager.updateStats(serverStats);
    
    // Configure the appropriate transport based on the mode
    if (serverMode.type === 'http') {
      // For HTTP mode, we use Node.js HTTP server directly
      // since the official MCP SDK does not have an HttpServerTransport equivalent
      const httpMode = serverMode;
      const httpServer = new HttpServer((req, res) => {
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
        req.on('data', chunk => {
          body += chunk.toString();
        });
        
        req.on('end', async () => {
          try {
            const request = JSON.parse(body);
            const { tool, params } = request;
            
            // Add client connection
            const clientIp = req.socket.remoteAddress || 'unknown';
            updateConnections(req.socket.remotePort?.toString() || 'client', clientIp);
            
            // Call the appropriate tool via MCP SDK
            try {
              const startTime = Date.now();
              
              // Use the appropriate MCP SDK method to call the tool
              // Note: The MCP SDK does not have a callTool method, so we must
              // implement our own logic to route tool calls
              let result;
              
              // Find the matching tool in the list of registered tools
              if (serverTools.includes(tool)) {
                // Call the tool using the Blogger service directly
                switch (tool) {
                  case 'list_blogs':
                    const blogs = await bloggerService.listBlogs();
                    result = { blogs };
                    break;
                  case 'get_blog':
                    const blog = await bloggerService.getBlog(params.blogId);
                    result = { blog };
                    break;
                  case 'list_posts':
                    const posts = await bloggerService.listPosts(params.blogId, params.maxResults);
                    result = { posts };
                    break;
                  case 'search_posts':
                    const searchResults = await bloggerService.searchPosts(params.blogId, params.query, params.maxResults);
                    result = { posts: searchResults };
                    break;
                  case 'get_post':
                    const post = await bloggerService.getPost(params.blogId, params.postId);
                    result = { post };
                    break;
                  case 'create_post':
                    const newPost = await bloggerService.createPost(params.blogId, {
                      title: params.title,
                      content: params.content,
                      labels: params.labels
                    });
                    result = { post: newPost };
                    break;
                  case 'update_post':
                    const updatedPost = await bloggerService.updatePost(params.blogId, params.postId, {
                      title: params.title,
                      content: params.content,
                      labels: params.labels
                    });
                    result = { post: updatedPost };
                    break;
                  case 'delete_post':
                    await bloggerService.deletePost(params.blogId, params.postId);
                    result = { success: true };
                    break;
                  case 'list_labels':
                    const labels = await bloggerService.listLabels(params.blogId);
                    result = { labels };
                    break;
                  case 'get_label':
                    const label = await bloggerService.getLabel(params.blogId, params.labelName);
                    result = { label };
                    break;
                  case 'create_blog':
                    result = { 
                      error: 'Blog creation is not supported by the Blogger API. Please create a blog via the Blogger web interface.' 
                    };
                    break;
                  default:
                    throw new Error(`Unknown tool: ${tool}`);
                }
              } else {
                throw new Error(`Unknown tool: ${tool}`);
              }
              
              const duration = Date.now() - startTime;
              
              // Update success statistics
              updateStats(tool, true, duration);
              
              res.writeHead(200, { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              });
              res.end(JSON.stringify(result));
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
        console.log(`Web UI available at http://localhost:${uiPort}`);
      });
    } else {
      // For stdio mode, we use the official MCP SDK transport
      const transport = new StdioServerTransport();
      await server.connect(transport);
      console.log(`Blogger MCP server started in stdio mode`);
      console.log(`Web UI available at http://localhost:${uiPort}`);
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
      
      uiManager.updateStats(updatedStats);
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
      
      uiManager.updateConnections(Object.values(connections));
      
      // Update status with connection count
      const updatedStatus: ServerStatus = {
        ...serverStatus,
        connections: Object.keys(connections).length
      };
      
      uiManager.updateStatus(updatedStatus);
    }
  } catch (error) {
    console.error('Error starting Blogger MCP server:', error);
    process.exit(1);
  }
}

// Run main function
main();
