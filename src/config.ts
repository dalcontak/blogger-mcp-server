function safeInt(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

export const config = {
  mode: process.env.MCP_MODE || 'stdio',

  http: {
    host: process.env.MCP_HTTP_HOST || '0.0.0.0',
    port: safeInt(process.env.MCP_HTTP_PORT, 3000)
  },

  blogger: {
    apiKey: process.env.BLOGGER_API_KEY,
    maxResults: safeInt(process.env.BLOGGER_MAX_RESULTS, 10),
    timeout: safeInt(process.env.BLOGGER_API_TIMEOUT, 30000)
  },

  oauth2: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info'
  },

  ui: {
    port: safeInt(process.env.UI_PORT, 0)
  }
};
