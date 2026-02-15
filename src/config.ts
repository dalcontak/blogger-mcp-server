// MCP server configuration for Blogger
export const config = {
  // Server operating mode (stdio or http)
  mode: process.env.MCP_MODE || 'stdio',
  
  // HTTP mode configuration (if used)
  http: {
    host: process.env.MCP_HTTP_HOST || '0.0.0.0',
    port: parseInt(process.env.MCP_HTTP_PORT || '3000', 10)
  },
  
  // Blogger API configuration
  blogger: {
    apiKey: process.env.BLOGGER_API_KEY,
    // Default maximum number of results for list queries
    maxResults: parseInt(process.env.BLOGGER_MAX_RESULTS || '10', 10),
    // API request timeout in milliseconds
    timeout: parseInt(process.env.BLOGGER_API_TIMEOUT || '30000', 10)
  },
  
  // OAuth2 configuration for authenticated operations (create, update, delete)
  // If these variables are not set, the server runs in read-only mode (API key)
  oauth2: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};
